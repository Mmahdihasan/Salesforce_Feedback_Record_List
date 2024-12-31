public with sharing class FeedbackController {
    @AuraEnabled
    public static void updateEditFeedback(Feedback__c updatedEditFeedback) {
        try {
            update updatedEditFeedback;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating feedback: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void insertNewFeedback(Feedback__c insertNewFeedback) {
        try {
            insert insertNewFeedback;
        } catch (Exception e) {
            throw new AuraHandledException('Error inserting feedback: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Contact> getContacts(String searchKey) {
        String query = '%' + searchKey + '%';
        return [SELECT Id, Name FROM Contact WHERE Name LIKE :query LIMIT 10];
    }

    @AuraEnabled
    public static List<Account> getAccounts(String searchKey) {
        String query = '%' + searchKey + '%';
    return [
        SELECT Id, Name 
        FROM Account 
        WHERE Name LIKE :query
        LIMIT 10
    ];
  }

  @AuraEnabled
  public static void deleteFeedbackRecord(Id feedbackId) {
      Feedback__c feedbackToDelete = [SELECT Id FROM Feedback__c WHERE Id = :feedbackId LIMIT 1];
      if (feedbackToDelete != null) {
          delete feedbackToDelete; // Delete the record
      }
  }
  

}