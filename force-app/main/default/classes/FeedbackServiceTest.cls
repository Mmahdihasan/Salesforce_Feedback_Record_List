@isTest
private class FeedbackServiceTest {

    @isTest
    static void testBulkUpdateFeedback() {
        // Create test feedback records
        List<Feedback__c> feedbackList = new List<Feedback__c>();
        for (Integer i = 0; i < 100; i++) {
            Feedback__c f = new Feedback__c(Name = 'Test Feedback ' + i, Rating__c = 4, Comment__c = 'excellent');
            feedbackList.add(f);
        }
        insert feedbackList;
        
        // Instantiate the batch class and run the batch
        Test.startTest();
        FeedbackService batch = new FeedbackService('excellent');
        Database.executeBatch(batch,100);
        Test.stopTest();

        // Verify that feedback ratings have been updated
        List<Feedback__c> updatedFeedbackList = [SELECT Rating__c FROM Feedback__c WHERE Id IN :feedbackList];
        for (Feedback__c f : updatedFeedbackList) {
            System.assertEquals(6, f.Rating__c, 'Rating should be increased by 2');
        }
    }

    @isTest
    static void testInvalidFeedbackRating() {
        // Create feedback records including one with a null rating
        List<Feedback__c> feedbackList = new List<Feedback__c>{
            new Feedback__c(Name = 'Valid Feedback', Rating__c = 4, Comment__c = 'excellent'),
            new Feedback__c(Name = 'Invalid Feedback', Rating__c = null, Comment__c = 'excellent')
        };
        insert feedbackList;

        // Simulate the execution of the batch
        FeedbackService batch = new FeedbackService('excellent');

        try {
            // Call the execute method directly with the feedback list
            batch.execute(null, feedbackList);
            System.assert(false, 'An exception should have been thrown due to null Rating__c');
        } catch (FeedbackService.CustomException e) {
            System.assert(e.getMessage().contains('Rating__c is required'), 'Expected exception for missing Rating__c');
        }
    }
}
