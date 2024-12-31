public with sharing class feedbackManagerHelper {
    @AuraEnabled(cacheable=true)
    public static List<Feedback__c> getFeedbackRecords() {
        return [SELECT Name, Contact__r.Name, Account__r.Name, Rating__c, Comment__c, Date__c FROM Feedback__c];
    }

    @AuraEnabled
    public static void updateFeedbackRecords(List<Feedback__c> feedbackList) {
        update feedbackList;
    }

    @AuraEnabled(cacheable=true)
    public static List<User> getUsers(String searchKey) {
    String key = '%' + searchKey + '%'; // '%' ensures it works with empty searchKey
    return [
        SELECT Id, Name, Email
        FROM User
        WHERE IsActive = true
        AND (Name LIKE :key OR Email LIKE :key)
    ];
    }

    @AuraEnabled
    public static void updateFeedbackOwners(List<Id> feedbackIds, Id newOwnerId) {
    List<Feedback__c> feedbackRecords = [SELECT Id FROM Feedback__c WHERE Id IN :feedbackIds];
    for (Feedback__c feedback : feedbackRecords) {
        feedback.OwnerId = newOwnerId;
    }
    
    try {
        update feedbackRecords;
    } catch (DmlException ex) {
        throw new AuraHandledException('Error updating feedback owners: ' + ex.getMessage());
    }
    }

    @AuraEnabled
public static void sendEmailToNewOwner(Id newOwnerId, List<Id> feedbackIds) {
    // Fetch the user's email
    User user = [SELECT Email FROM User WHERE Id = :newOwnerId LIMIT 1];
    
    // Prepare feedback record names and links
    List<Feedback__c> feedbackRecords = [SELECT Name, Id FROM Feedback__c WHERE Id IN :feedbackIds];
    String feedbackDetails = ''; // Initialize an empty string to store feedback details
    
    // Your Salesforce org link (you should dynamically fetch this if needed)
    String salesforceUrl = 'https://playful-impala-7hmw67-dev-ed.trailblaze.lightning.force.com/';
    
    for (Feedback__c feedback : feedbackRecords) {
        // Construct the clickable feedback link dynamically using the feedback ID
        String feedbackLink = salesforceUrl+ feedback.Id; // Dynamically append the feedback ID
        feedbackDetails += feedback.Name + ': <a href="' + feedbackLink + '" target="_blank">' + feedbackLink + '</a><br>';
    }
    
    // Create the email message
    Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
    mail.setToAddresses(new String[] { user.Email });
    mail.setSubject('You have been assigned as the new owner of feedback records');
    
    // Construct email body with feedback details and clickable links
    String emailBody = 'You have been assigned as the new owner of the following feedback records:<br>' 
                        + feedbackDetails + '\n'
                        + 'Please review them.';
    mail.setHtmlBody(emailBody); // Use setHtmlBody to support HTML in email body
    
    // Send the email 
    try{
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }
    catch(Exception e){
        throw new AuraHandledException('Error sending email: ' + e.getMessage());
    }
}

@AuraEnabled(cacheable=true)
public static List<Group> getQueues(String searchKey) {
    String key = '%' + searchKey + '%'; // Use search key to filter queues
    return [
        SELECT Id, Name
        FROM Group
        WHERE Type = 'Queue'
        AND Name LIKE :key
    ];
}

@AuraEnabled
public static void sendEmailToQueueMembers(Id queueId, List<Id> feedbackIds) {
    // Fetch queue members
    List<GroupMember> queueMembers = [
        SELECT UserOrGroupId 
        FROM GroupMember 
        WHERE GroupId = :queueId
    ];

    // Collect emails of queue members
    List<String> emailAddresses = new List<String>();
    for (GroupMember member : queueMembers) {
        if (String.valueOf(member.UserOrGroupId).startsWith('005')) { // User Id starts with '005'
            User user = [SELECT Email FROM User WHERE Id = :member.UserOrGroupId];
            emailAddresses.add(user.Email);
        }
    }

    // Prepare feedback record names and links
    List<Feedback__c> feedbackRecords = [SELECT Name, Id FROM Feedback__c WHERE Id IN :feedbackIds];
    String feedbackDetails = '';

    // Your Salesforce org link (replace with your actual Salesforce domain)
    String salesforceUrl = 'https://playful-impala-7hmw67-dev-ed.trailblaze.lightning.force.com/';

    for (Feedback__c feedback : feedbackRecords) {
        String feedbackLink = salesforceUrl + feedback.Id; // Construct feedback URL
        feedbackDetails += feedback.Name + ': <a href="' + feedbackLink + '" target="_blank">' + feedbackLink + '</a><br>';
    }

    // Create the email message
    Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
    mail.setToAddresses(emailAddresses);
    mail.setSubject('You have been assigned as the new owner of feedback records');
    
    // Construct email body with feedback details and clickable links
    String emailBody = 'The following feedback records have been assigned to your queue:<br>' 
                        + feedbackDetails + '\n'
                        + 'Please review them.';
    mail.setHtmlBody(emailBody); // Use setHtmlBody to support HTML in email body
    
    // Send the email 
    try{
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }
    catch(Exception e){
        throw new AuraHandledException('Error sending email: ' + e.getMessage());
    }
}

}
   