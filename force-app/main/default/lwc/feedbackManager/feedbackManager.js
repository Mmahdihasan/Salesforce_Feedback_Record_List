import { LightningElement, wire, track } from 'lwc';
import getFeedbackRecords from '@salesforce/apex/feedbackManagerHelper.getFeedbackRecords';
import updateFeedbackRecords from '@salesforce/apex/feedbackManagerHelper.updateFeedbackRecords';
import getUsers from '@salesforce/apex/feedbackManagerHelper.getUsers';
import getQueues from '@salesforce/apex/feedbackManagerHelper.getQueues';
import updateFeedbackOwners from '@salesforce/apex/feedbackManagerHelper.updateFeedbackOwners';
import sendEmailToNewOwner from '@salesforce/apex/feedbackManagerHelper.sendEmailToNewOwner';
import sendEmailToQueueMembers from '@salesforce/apex/feedbackManagerHelper.sendEmailToQueueMembers';
import updateEditFeedback from '@salesforce/apex/FeedbackController.updateEditFeedback';
import insertNewFeedback from '@salesforce/apex/FeedbackController.insertNewFeedback';
import deleteFeedbackRecord from '@salesforce/apex/FeedbackController.deleteFeedbackRecord';
import getContacts from '@salesforce/apex/FeedbackController.getContacts';
import getAccounts from '@salesforce/apex/FeedbackController.getAccounts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadChartJs, initializeChart, calculateRatingDistribution } from './chartHelper';
import { sortData } from './sortHelper';
import { refreshApex } from '@salesforce/apex';


export default class FeedbackManager extends LightningElement {
    @track feedbackData = [];
    @track displayedFeedbackData = [];
    @track sortedBy = '';
    @track sortedDirection = 'asc';
    @track draftValues = [];
    @track columns = [
        { label: 'Feedback Name', fieldName: 'FeedbackUrl', type: 'url',typeAttributes: { label: { fieldName: 'Name' }}, sortable: true },
        { label: 'Contact', fieldName: 'ContactUrl', type: 'url',typeAttributes: { label: { fieldName: 'ContactName' }}, sortable: true },
        { label: 'Account', fieldName: 'AccountUrl', type: 'url', typeAttributes: { label: { fieldName: 'AccountName' }}, sortable: true },
        { label: 'Rating', fieldName: 'Rating__c', type: 'number', editable: true, sortable: true },
        { label: 'Comment', fieldName: 'Comment__c', type: 'text', editable: true, sortable: true },
        { label: 'Date', fieldName: 'Date__c', type: 'date', editable: true, sortable: true },
        {
             type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'Edit', name: 'edit' }, // Edit option
                    { label: 'Delete', name: 'delete' } // Delete option
                ]
            } 
        }
    ];
    @track globalSelectedIds = new Set(); // Global tracker for selected row IDs

    currentPage = 1;
    pageSize = 5;
    totalRecords = 0;
    totalPages = 0;

    // Filters
    searchKey = '';
    startDate = null;
    endDate = null;
    wiredFeedbackResult; // Holds the wire lifecycle object

    @wire(getFeedbackRecords)
    wiredFeedback(result) {
        this.wiredFeedbackResult = result; // Store the wire result
        const { data, error } = result;
        if (data) {
            this.feedbackData = data.map(record => ({
                ...record,
                FeedbackUrl: `/lightning/r/Feedback__c/${record.Id}/view`, // Feedback URL
                ContactName: record.Contact__r ? record.Contact__r.Name : '', // Contact Name
                ContactUrl: record.Contact__r ? `/lightning/r/Contact/${record.Contact__r.Id}/view` : null, // Contact URL
                AccountName: record.Account__r ? record.Account__r.Name : '', // Account Name
                AccountUrl: record.Account__r ? `/lightning/r/Account/${record.Account__r.Id}/view` : null // Account URL
            }));
            this.totalRecords = data.length;
            this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
            this.updateDisplayedData();
            if (this.chartRendered) {
                this.renderChart(); // Re-render chart if data changes
            }
        } else if (error) {
            console.error(error);
        }
    }

    @track isEditModalOpen = false; // Tracks modal visibility
     // Stores the record to be edited
    @track contactSearchResults = [];
    @track selectedFeedbackEditRecord = {};
    @track contactSearchKey = '';
    @track selectedContactId = '';
    @track selectedContactName = '';
    @track accountSearchResults = [];
    @track accountSearchKey = '';
    @track selectedAccountId = '';
    @track selectedAccountName = '';

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
    
        switch (actionName) {
            case 'edit':
                this.handleRowEditAction(row); // Handle edit as previously implemented
                break;
            case 'delete':
                this.deleteFeedbackRecord(row); // Handle delete
                break;
            default:
                break;
        }
    }

    deleteFeedbackRecord(row) {
        // Show confirmation or directly delete the record
        if (confirm('Are you sure you want to delete this record?')) {
            // Call Apex to delete the feedback record from Salesforce
            deleteFeedbackRecord({ feedbackId: row.Id }) // Replace with the correct field name
            .then(() => {
                // Update the data in the datatable without refreshing the browser
                return refreshApex(this.wiredFeedbackResult); // Refresh the wired data
            })
            .then(() => {
                    // Update the local data source (Feedback records) after deletion
                    this.feedbackRecords = this.feedbackRecords.filter(record => record.Id !== row.Id);
                })
            .catch(error => {
                    console.error('Error deleting feedback record:', error);
                });
        }
    }

    handleRowEditAction(row) {
            this.selectedFeedbackEditRecord = { ...row }; // Clone the selected row data
            console.log('Selected Feedback Record:', JSON.stringify(this.selectedFeedbackEditRecord));
            // Pre-fill Contact field
            this.contactSearchKey = row.ContactName || '';
            this.selectedContactId = row.ContactId || '';
            this.selectedContactName = row.ContactName || '';

            // Pre-fill Account field
            this.accountSearchKey = row.AccountName || '';
            this.selectedAccountId = row.AccountId || '';
            this.selectedAccountName = row.AccountName || '';

            this.isEditModalOpen = true; // Open the modal
            document.body.style.overflow = 'hidden';
    }

    handleFieldChange(event) {
        const field = event.target.dataset.field; // Identify the field
        this.selectedFeedbackEditRecord[field] = event.target.value; // Update the field in the record
    }

    // Handle search input change
    handleContactSearch(event) {
        this.contactSearchKey = event.target.value; // Get search query
        if (this.contactSearchKey.length >= 1) { // Trigger search after typing 2 or more characters
            getContacts({ searchKey: this.contactSearchKey })
                .then(result => {
                    this.contactSearchResults = result.map(contact => ({
                        Id: contact.Id,
                        Name: contact.Name
                    }));
                })
                .catch(error => {
                    console.error('Error fetching contacts', error);
                });
        } else {
            this.contactSearchResults = []; // Clear search results if query is too short
        }
    }

    handleAccountSearch(event) {
        this.accountSearchKey = event.target.value; // Get search query
        if (this.accountSearchKey.length >= 1) { // Trigger search after typing 2 or more characters
            getAccounts({ searchKey: this.accountSearchKey })
                .then(result => {
                    this.accountSearchResults = result.map(account => ({
                        Id: account.Id,
                        Name: account.Name
                    }));
                })
                .catch(error => {
                    console.error('Error fetching accounts', error);
                });
        } else {
            this.accountSearchResults = []; // Clear search results if query is too short
        }
    }

    // Handle contact selection
    handleContactSelection(event) {
        const contactId = event.target.dataset.id; // Get selected contact Id
        const selectedContact = this.contactSearchResults.find(contact => contact.Id === contactId);
        if (selectedContact) {
            this.selectedContactId = selectedContact.Id;
            console.log('Selected Contact Id:', this.selectedContactId);
            this.selectedContactName = selectedContact.Name;
            console.log('Selected Contact Name:', this.selectedContactName);
            this.contactSearchResults = []; // Clear search results after selection
        }
    }

    handleAccountSelection(event) {
        const accountId = event.target.dataset.id; // Get selected account Id
        const selectedAccount = this.accountSearchResults.find(account => account.Id === accountId);
        if (selectedAccount) {
            this.selectedAccountId = selectedAccount.Id;
            console.log('Selected Account Id:', this.selectedAccountId);
            this.selectedAccountName = selectedAccount.Name;
            console.log('Selected Account Name:', this.selectedAccountName);
            this.accountSearchResults = []; // Clear search results after selection
        }
    }

    // Clear contact selection
    clearContactSelection() {
        this.selectedContactId = ''; // Clear the selected contact ID
        this.selectedContactName = ''; // Clear the selected contact name
        this.contactSearchResults = []; // Clear search results
        this.contactSearchKey = ''; // Clear the search key
    }

    clearAccountSelection() {
        this.selectedAccountId = ''; // Clear the selected account ID
        this.selectedAccountName = ''; // Clear the selected account name
        this.accountSearchResults = []; // Clear search results
        this.accountSearchKey = ''; // Clear the search key
    }


    saveChanges() {
        // Only update the relevant fields
    if (this.selectedContactId) {
        this.selectedFeedbackEditRecord.Contact__c = this.selectedContactId; // Set Contact field
    }
    if (this.selectedAccountId) {
        this.selectedFeedbackEditRecord.Account__c = this.selectedAccountId; // Set Account field
    }
    
        // Call Apex to update the record in Salesforce
        updateEditFeedback({ updatedEditFeedback: this.selectedFeedbackEditRecord })
            .then(() => {
                // Update the data in the datatable without refreshing the browser
                return refreshApex(this.wiredFeedbackResult); // Refresh the wired data
            })
            .then(() => {
                // Clear search bar and close modal
                this.contactSearchKey = '';
                this.selectedContactId = '';
                this.selectedContactName = '';
                this.contactSearchResults = [];

                this.accountSearchKey = '';
                this.selectedAccountId = '';
                this.selectedAccountName = '';
                this.accountSearchResults = [];

                this.closeModal();
            })
            .catch(error => {
                console.error('Error updating feedback record:', error);
            });
    }

    closeModal() {
        this.isEditModalOpen = false; // Close the modal
        this.selectedFeedbackEditRecord = {}; // Clear the record data
        document.body.style.overflow = 'auto';

        // Clear Contact-related properties
        this.contactSearchKey = '';
        this.selectedContactId = '';
        this.selectedContactName = '';
        this.contactSearchResults = [];

        // Clear Account-related properties
        this.accountSearchKey = '';
        this.selectedAccountId = '';
        this.selectedAccountName = '';
        this.accountSearchResults = [];
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleSort(event) {
        this.sortedBy = event.detail.fieldName; // Dynamically set the field being sorted
        this.sortedDirection = event.detail.sortDirection; // Set the sort direction (asc/desc)

        // Use the imported sortData function
        this.feedbackData = sortData(this.feedbackData, this.sortedBy, this.sortedDirection);
        
        // Update the data displayed on the page
        this.updateDisplayedData();
    }

    updateDisplayedData() {
        let filteredData = [...this.feedbackData];
    
        // Apply search filters
        if (this.searchKey) {
            filteredData = filteredData.filter(record =>
                record.Name.toLowerCase().includes(this.searchKey.toLowerCase()) ||
                record.Comment__c.toLowerCase().includes(this.searchKey.toLowerCase())
            );
        }
    
        // Apply date range filters using Date__c
        if (this.startDate || this.endDate) {
            filteredData = filteredData.filter(record => {
                const recordDate = new Date(record.Date__c);
                const isAfterStart = this.startDate ? recordDate >= new Date(this.startDate) : true;
                const isBeforeEnd = this.endDate ? recordDate <= new Date(this.endDate) : true;
                return isAfterStart && isBeforeEnd;
            });
        }
    
        this.totalRecords = filteredData.length;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    
        const start = (this.currentPage - 1) * this.pageSize;
        const end = Math.min(start + this.pageSize, this.totalRecords); // Ensure it doesn't exceed total records
        this.displayedFeedbackData = filteredData.slice(start, end);
    
        // Update the displayed record count text
        this.pageInfoText = `${this.displayedFeedbackData.length} out of ${this.totalRecords}`;
    
        // Restore selected rows for the current page if datatable exists
        const datatable = this.template.querySelector('lightning-datatable');
        if (datatable) {
            const selectedIds = new Set(this.selectedRecords.map(record => record.Id));
            const selectedRowsForPage = this.displayedFeedbackData.filter(record => selectedIds.has(record.Id));
            datatable.selectedRows = selectedRowsForPage.map(record => record.Id);
        }
    }

    handleSearchKeyChange(event) {
        this.searchKey = event.target.value;
        this.updateDisplayedData();
    }

    handleDateChange(event) {
        const { name, value } = event.target;
        if (name === 'startDate') {
            this.startDate = value;
        } else if (name === 'endDate') {
            this.endDate = value;
        }
        this.updateDisplayedData();
    }

    handleCellChange(event) {
        this.draftValues = event.detail.draftValues;
    }

    async handleSave() {
        try {
            await updateFeedbackRecords({ feedbackList: this.draftValues });
            this.draftValues = [];
            this.showToast('Success', 'Records updated successfully', 'success');
        } catch (error) {
            this.showToast('Error', 'An error occurred while saving', 'error');
        }
    }

    exportToCSV() {
        // If no filters are applied, export all feedback data
    const dataToExport = 
        !this.searchKey && !this.startDate && !this.endDate 
            ? this.feedbackData // All records
            : this.displayedFeedbackData; // Filtered records

    if (!dataToExport || dataToExport.length === 0) {
        this.showToast('Info', 'No data to export.', 'info');
        return;
    }

    const csvContent = this.convertToCSV(dataToExport);

    // Create a hidden anchor tag for download
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvContent);
    hiddenElement.target = '_self';
    hiddenElement.download = 'FeedbackData.csv';

    // Append to the body to simulate a user action and trigger download
    document.body.appendChild(hiddenElement);
    hiddenElement.click();
    document.body.removeChild(hiddenElement);
    }

    convertToCSV(data) {
        if (!data || data.length === 0) {
            return ''; // Ensure this line ends with a semicolon
        }
    
        // Mapping custom field API names to display names
        const headerMapping = {
            'Name': 'Name',
            'Contact__c': 'Contact',
            'Account__c': 'Account',
            'Rating__c': 'Rating',
            'Comment__c': 'Comment',
            'Date__c': 'Date'
        };
    
        // Define the columns you want to include in the export
        const selectedColumns = ['Name', 'Contact__c', 'Account__c', 'Rating__c', 'Comment__c', 'Date__c'];
    
        // Filter the data to include only the selected columns and related names
        const filteredData = data.map(row => {
            return selectedColumns.reduce((acc, column) => {
                // Replace Contact and Account IDs with their related names
                if (column === 'Contact__c') {
                    acc['Contact'] = row['Contact__r'] ? row['Contact__r'].Name : '';  // Contact Name
                } else if (column === 'Account__c') {
                    acc['Account'] = row['Account__r'] ? row['Account__r'].Name : '';  // Account Name
                } else {
                    acc[headerMapping[column]] = row[column] || '';  // Include the value or an empty string if not present
                }
                return acc;
            }, {});
        });
    
        // Extract headers from the headerMapping object
        const headers = selectedColumns.map(column => headerMapping[column]).join(',');
    
        // Map rows into CSV format
        const csvRows = filteredData.map(row =>
            selectedColumns.map(column => row[headerMapping[column]] || '').join(',')
        );
    
        // Combine headers and rows
        return [headers, ...csvRows].join('\n'); // Semicolon here too
    }
    
    // Pagination
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateDisplayedData();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updateDisplayedData();
        }
    }

    get pageNumberText() {
        return `${this.currentPage} of ${this.totalPages}`;
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage === this.totalPages;
    }

    //change owner

    @track selectedRecords = [];
    @track isButtonActive = false;

    get isButtonDisabled() {
        return !this.isButtonActive;
    }
 
    handleRowSelection(event) {
        // Get the currently selected rows from the event
        const currentSelectedRows = event.detail.selectedRows;
    
        // Create a Set to track selected IDs
        const selectedIds = new Set(this.selectedRecords.map(record => record.Id));
    
        // Add newly selected rows to the Set
        currentSelectedRows.forEach(row => selectedIds.add(row.Id));
    
        // Remove deselected rows (rows visible in the current page but not in currentSelectedRows)
        this.displayedFeedbackData.forEach(record => {
            if (!currentSelectedRows.some(row => row.Id === record.Id)) {
                selectedIds.delete(record.Id);
            }
        });
    
        // Update the selectedRecords property with all selected records
        this.selectedRecords = this.feedbackData.filter(record => selectedIds.has(record.Id));
    
        // Enable/Disable button based on selection
        this.isButtonActive = this.selectedRecords.length > 0;
    }
    
    handleOpenModal() {
        if (this.selectedRecords.length > 0) {
            this.isModalOpen = true;
        }
        document.body.style.overflow = 'hidden';
    }
    handleClose() {
        this.isModalOpen = false;
        this.resetModalState();
        this.isEmailSelected = false;
        document.body.style.overflow = 'auto';
    }

    handleEmailCheckboxChange(event) {
        this.isEmailSelected = event.target.checked;
    }


    //New button
    @track isNewModalOpen = false;
    @track newFeedbackRecord = {};

    handleOpenNewModal(){
        this.isNewModalOpen = true;
        document.body.style.overflow = 'hidden';
    }
    closeNewModal(){
        this.isNewModalOpen = false;
        document.body.style.overflow = 'auto';
    }

    handleNewFeedbackRecord(event) {
        const field = event.target.dataset.field; // Identify the field (e.g., Name, Rating__c, Comment__c)
        this.newFeedbackRecord[field] = event.target.value // Dynamically set the new field value
        
        console.log('New Feedback Record:', JSON.stringify(this.newFeedbackRecord));
    }

    saveNewFeedback(){
        // Only update the relevant fields
    if (this.selectedContactId) {
        this.newFeedbackRecord.Contact__c = this.selectedContactId; // Set Contact field
    }
    if (this.selectedAccountId) {
        this.newFeedbackRecord.Account__c = this.selectedAccountId; // Set Account field
    }
    
        // Call Apex to update the record in Salesforce
        insertNewFeedback({ insertNewFeedback: this.newFeedbackRecord })
            .then(() => {
                // Update the data in the datatable without refreshing the browser
                return refreshApex(this.wiredFeedbackResult); // Refresh the wired data
            })
            .then(() => {
                // Clear search bar and close modal
                this.contactSearchKey = '';
                this.selectedContactId = '';
                this.selectedContactName = '';
                this.contactSearchResults = [];

                this.accountSearchKey = '';
                this.selectedAccountId = '';
                this.selectedAccountName = '';
                this.accountSearchResults = [];

                this.closeNewModal();
            })
            .catch(error => {
                console.error('Error inserting feedback record:', error);
            });
    }
       
    @track isModalOpen = false;
    @track isUserSelected = false;
    @track isEmailSelected = false;
    @track userList = [];     // List of users fetched from Apex
    @track fullUserList = [];
    @track isDropdownVisible = false;  // To control visibility of the dropdown
    @track searchKey = '';    // Search term

    @track isDropdownOpen = false; // Tracks if dropdown is open
    @track selectedOption = 'Select'; // Default dropdown text
    @track isUserDropdownActive = false; // Tracks if "User" is selected
    @track isDropdownVisible = false;  // To control visibility of the dropdown

    @track isQueueDropdownActive = false; // Tracks if "Queue" is selected
    @track queueList = [];      // List of queues fetched from Apex
    @track fullQueueList = [];  // Full list of queues
    @track isQueueSelected = false;

    // Toggles the dropdown menu
    toggleDropdown() {
        this.isDropdownOpen = !this.isDropdownOpen;
    }


    // Handles the selection of 'User'
    selectUser() {
        this.selectedOption = 'User';
        this.isDropdownOpen = false; // Close dropdown after selection
        this.isUserDropdownActive = true; // Activate user-related features
        this.isQueueDropdownActive = false; // Deactivate queue-related features
        this.isDropdownVisible = true; // Show user dropdown
        this.searchKey = ''; // Clear the search term
    }

    // Handles the selection of 'Queue'
    selectQueue() {
        this.selectedOption = 'Queue';
        this.isDropdownOpen = false; // Close dropdown after selection
        this.isQueueDropdownActive = true; // Activate queue-related features
        this.isUserDropdownActive = false; // Deactivate user-related features
        this.isDropdownVisible = true; // Show queue dropdown
        this.searchKey = ''; // Clear the search term
    }

    // Handles search input for queue
    
    handleSearchChange(event) {
        this.searchKey = event.target.value.toLowerCase();

        if (this.isUserDropdownActive) {
            // Filter users based on the search term
            this.userList = this.fullUserList.filter(user =>
                user.Name.toLowerCase().includes(this.searchKey)
            );
        } else if (this.isQueueDropdownActive) {
            // Filter queues based on the search term
            this.queueList = this.fullQueueList.filter(queue =>
                queue.Name.toLowerCase().includes(this.searchKey)
            );
        }

        this.isDropdownVisible = this.isUserDropdownActive 
            ? this.userList.length > 0 
            : this.queueList.length > 0;
    }

    // Handles queue selection from the dropdown
    handleQueueSelect(event) {
        const selectedQueueName = event.target.dataset.name;
        const selectedQueueId = event.target.dataset.id;

        this.searchKey = selectedQueueName; // Display selected queue name
        this.selectedQueueId = selectedQueueId; // Store queue ID
        this.isDropdownVisible = false; // Hide dropdown
        this.isQueueSelected = true; // Mark that a queue is selected
        this.isUserSelected = false;

        console.log('Selected Queue ID:', selectedQueueId);
    }

    // Handles user selection from the dropdown
    handleUserSelect(event) {
        const selectedUserName = event.target.dataset.name; // Get user name
        const selectedUserId = event.target.dataset.id;     // Get user ID

        this.searchKey = selectedUserName; // Update the search bar with the selected user's name
        this.selectedUserId = selectedUserId; // Store the selected user's ID
        this.isDropdownVisible = false;   // Hide the dropdown
        this.isUserSelected = true;       // Mark that a user is selected
        this.isQueueSelected = false;

        console.log('Selected User ID:', selectedUserId);
    }

    handleSubmit() {
        // Check if either a user or a queue is selected along with feedback records
        if (this.selectedUserId || this.selectedQueueId) {
            let newOwnerId = null;
    
            // Determine which selection is active
            if (this.isQueueSelected) {
                newOwnerId = this.selectedQueueId;
                console.log("queue:",this.selectedQueueId);
            } else if (this.isUserSelected) {
                newOwnerId = this.selectedUserId;
                console.log("user:",this.selectedUserId);
            }
    
            console.log('isEmailSelected:', this.isEmailSelected);
            console.log('newOwnerId:', newOwnerId);
    
            // Call Apex to update the owner
            updateFeedbackOwners({
                feedbackIds: this.selectedRecords.map(record => record.Id),
                newOwnerId: newOwnerId
            })
            .then(() => {
                // Check if the "Send email to owner" checkbox is selected
                if (this.isEmailSelected) {
                    if (newOwnerId === this.selectedUserId) {
                        // Send email to the selected user
                        this.sendEmailToNewOwner(this.selectedUserId, this.selectedRecords.map(record => record.Id));
                        console.log('Email sent to User ID:', this.selectedUserId);
                    } else if (newOwnerId === this.selectedQueueId) {
                        // Send email to queue members
                        this.sendEmailToQueue(this.selectedQueueId, this.selectedRecords.map(record => record.Id));
                        console.log('Email sent to Queue ID:', this.selectedQueueId);
                    }
                }
    
                // Reset modal state
                this.resetAllSelections(); // Clear all selections (users and queues)
                this.isModalOpen = false;  // Close the modal
    
                // Optional: refresh the table
                return refreshApex(this.wiredFeedback); // Assumes a wire is used for feedback table
            })
            .catch(error => {
                let errorMessage = 'An unknown error occurred';
                if (error.body && error.body.message) {
                    errorMessage = error.body.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
            });
        } else {
            // Validation: Ensure a user or queue is selected
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Please select a user or queue to assign as the new owner.',
                    variant: 'error'
                })
            );
        }
    }
    
    get isConditionMet() {
        return this.isUserSelected || this.isQueueSelected;
    }

     // Fetches queue list when search bar is focused
    handleFocus() {
        this.isDropdownVisible = true;
        if (this.isUserDropdownActive) {
            getUsers({ searchKey: '' })
                .then((result) => {
                    this.fullUserList = result;
                    this.userList = [...this.fullUserList];
                })
                .catch((error) => {
                    console.error('Error fetching users:', error);
                    this.fullUserList = [];
                    this.userList = [];
                    this.isDropdownVisible = false;
                });
        } else if (this.isQueueDropdownActive) {
            getQueues({ searchKey: '' })
                .then((result) => {
                    this.fullQueueList = result;
                    this.queueList = [...this.fullQueueList];
                })
                .catch((error) => {
                    console.error('Error fetching queues:', error);
                    this.fullQueueList = [];
                    this.queueList = [];
                    this.isDropdownVisible = false;
                });
        }
    }


    // Reset all selections and lists
    resetAllSelections() {
        this.searchKey = '';
        this.isQueueSelected = false;
        this.isUserSelected = false;
        // Maintain dropdown visibility and active states
        if (this.isUserSelected) {
            this.isUserDropdownActive = true;
            this.isQueueDropdownActive = false;
        } else if (this.isQueueSelected) {
            this.isQueueDropdownActive = true;
            this.isUserDropdownActive = false;
        }
        this.isDropdownVisible = true;
        this.userList = [...this.fullUserList];
        this.queueList = [...this.fullQueueList];
    }

    // Clear search term and reset to the appropriate dropdown based on the selection
    handleClearSearch() {
        this.searchKey = ''; // Clear search term
        if (this.isUserDropdownActive) {
            // Reset to show the user list
            this.userList = [...this.fullUserList];
        } else if (this.isQueueDropdownActive) {
            // Reset to show the queue list
            this.queueList = [...this.fullQueueList];
        }
        this.isDropdownVisible = true; // Ensure dropdown is still visible
    }

    sendEmailToNewOwner(newOwnerId, feedbackIds) {
        sendEmailToNewOwner({ newOwnerId, feedbackIds }) // Call the Apex method
    }
    
    sendEmailToQueue(queueId, feedbackIds) {
        sendEmailToQueueMembers({ queueId, feedbackIds }) // Call the Apex method
    }    

    renderedCallback() {
        if (this.chartRendered || this.feedbackData.length === 0) {
            return;
        }
        this.chartRendered = true;

        loadChartJs(this)
            .then(() => {
                console.log('Chart.js loaded successfully');
                this.renderChart();
            })
            .catch((error) => {
                console.error('Error loading Chart.js', error);
            });
    }

    renderChart() {
        const canvas = this.template.querySelector('canvas');
        const ratingData = calculateRatingDistribution(this.feedbackData);
        this.chart = initializeChart(canvas, ratingData);
    }
}