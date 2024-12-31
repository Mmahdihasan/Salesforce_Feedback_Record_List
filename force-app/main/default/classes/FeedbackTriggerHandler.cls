public class FeedbackTriggerHandler {
   
    // Main logic for after operations - calculating and updating average ratings.
    public static void afterOperation(Map<Id, Feedback__c> oldMap, Map<Id, Feedback__c> newMap, TriggerOperation operationType) {
        // Collect related Account and Contact IDs for recalculating average ratings
        Set<Id> accountIds = new Set<Id>();
        Set<Id> contactIds = new Set<Id>();
        
        if (operationType == TriggerOperation.AFTER_INSERT || operationType == TriggerOperation.AFTER_UPDATE) {
            for (Feedback__c feedback : newMap.values()) {
                if (feedback.Account__c != null) accountIds.add(feedback.Account__c);
                if (feedback.Contact__c != null) contactIds.add(feedback.Contact__c);
            }
        }
        
        if (operationType == TriggerOperation.AFTER_DELETE) {
            for (Feedback__c feedback : oldMap.values()) {
                if (feedback.Account__c != null) accountIds.add(feedback.Account__c);
                if (feedback.Contact__c != null) contactIds.add(feedback.Contact__c);
            }
        }
        
        // Calculate average ratings and update Accounts
        if (!accountIds.isEmpty()) {
            try {
                updateAverageRatingForAccounts(accountIds);
            } catch (Exception e) {
                System.debug('Error updating Account ratings: ' + e.getMessage());
                // Optionally log to a custom error logging system
            }
        }
        
        // Calculate average ratings and update Contacts
        if (!contactIds.isEmpty()) {
            try {
                updateAverageRatingForContacts(contactIds);
            } catch (Exception e) {
                System.debug('Error updating Contact ratings: ' + e.getMessage());
                // Optionally log to a custom error logging system
            }
        }
    }

    // Helper method to calculate average ratings for Accounts
    private static void updateAverageRatingForAccounts(Set<Id> accountIds) {
        Map<Id, Decimal> accountRatingMap = new Map<Id, Decimal>();
        
        // Aggregate feedback ratings for each Account
        for (AggregateResult ar : [SELECT Account__c Id, AVG(Rating__c) avgRating
                                   FROM Feedback__c
                                   WHERE Account__c IN :accountIds
                                   GROUP BY Account__c]) {
            accountRatingMap.put((Id) ar.get('Id'), (Decimal) ar.get('avgRating'));
        }
        
        List<Account> accountsToUpdate = new List<Account>();
        for (Id accountId : accountRatingMap.keySet()) {
            Account acc = new Account(Id = accountId);
            acc.Average_Rating__c = accountRatingMap.get(accountId);
            accountsToUpdate.add(acc);
        }
        
        if (!accountsToUpdate.isEmpty()) {
            try {
                update accountsToUpdate;
            } catch (DmlException e) {
                System.debug('Error updating Account records: ' + e.getMessage());
                // Implement additional logging or re-throwing the exception if needed
            }
        }
    }

    // Helper method to calculate average ratings for Contacts
    private static void updateAverageRatingForContacts(Set<Id> contactIds) {
        Map<Id, Decimal> contactRatingMap = new Map<Id, Decimal>();
        
        // Aggregate feedback ratings for each Contact
        for (AggregateResult ar : [SELECT Contact__c Id, AVG(Rating__c) avgRating
                                   FROM Feedback__c
                                   WHERE Contact__c IN :contactIds
                                   GROUP BY Contact__c]) {
            contactRatingMap.put((Id) ar.get('Id'), (Decimal) ar.get('avgRating'));
        }
        
        List<Contact> contactsToUpdate = new List<Contact>();
        for (Id contactId : contactRatingMap.keySet()) {
            Contact con = new Contact(Id = contactId);
            con.Average_Rating__c = contactRatingMap.get(contactId);
            contactsToUpdate.add(con);
        }
        
        if (!contactsToUpdate.isEmpty()) {
            try {
                update contactsToUpdate;
            } catch (DmlException e) {
                System.debug('Error updating Contact records: ' + e.getMessage());
                // Implement additional logging or re-throwing the exception if needed
            }
        }
    }
}
