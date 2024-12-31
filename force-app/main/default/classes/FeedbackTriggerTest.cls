@isTest
private class FeedbackTriggerTest {

    @isTest
    static void testAfterInsert() {
        // Create test Account and Contact records
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        Contact con = new Contact(FirstName = 'Test', LastName = 'User');
        insert con;

        // Create test Feedback records
        Feedback__c feedback1 = new Feedback__c(
            Name = 'Feedback 1', 
            Rating__c = 5, 
            Comment__c = 'Excellent', 
            Account__c = acc.Id, 
            Contact__c = con.Id
        );
        Feedback__c feedback2 = new Feedback__c(
            Name = 'Feedback 2', 
            Rating__c = 4, 
            Comment__c = 'Good', 
            Account__c = acc.Id, 
            Contact__c = con.Id
        );

        insert new List<Feedback__c>{feedback1, feedback2};

        // Verify that average ratings are updated for Account and Contact
        acc = [SELECT Id, Average_Rating__c FROM Account WHERE Id = :acc.Id];
        con = [SELECT Id, Average_Rating__c FROM Contact WHERE Id = :con.Id];

        // Assuming average rating should be 4.5 for both Account and Contact
        System.assertEquals(4.5, acc.Average_Rating__c, 'Account Average Rating should be 4.5');
        System.assertEquals(4.5, con.Average_Rating__c, 'Contact Average Rating should be 4.5');
    }

    @isTest
    static void testAfterUpdate() {
        // Create test Account and Contact records
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        Contact con = new Contact(FirstName = 'Test', LastName = 'User');
        insert con;

        // Create test Feedback record
        Feedback__c feedback = new Feedback__c(
            Name = 'Feedback', 
            Rating__c = 5, 
            Comment__c = 'Excellent', 
            Account__c = acc.Id, 
            Contact__c = con.Id
        );
        insert feedback;

        // Update the Feedback record
        feedback.Rating__c = 4; // Update the rating
        update feedback;

        // Verify that average ratings are updated for Account and Contact
        acc = [SELECT Id, Average_Rating__c FROM Account WHERE Id = :acc.Id];
        con = [SELECT Id, Average_Rating__c FROM Contact WHERE Id = :con.Id];

        // The average rating should now be 4
        System.assertEquals(4, acc.Average_Rating__c, 'Account Average Rating should be 4');
        System.assertEquals(4, con.Average_Rating__c, 'Contact Average Rating should be 4');
    }

    @isTest
    static void testAfterDelete() {
        // Create test Account and Contact records
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        Contact con = new Contact(FirstName = 'Test', LastName = 'User');
        insert con;

        // Create test Feedback records
        Feedback__c feedback1 = new Feedback__c(
            Name = 'Feedback 1', 
            Rating__c = 5, 
            Comment__c = 'Excellent', 
            Account__c = acc.Id, 
            Contact__c = con.Id
        );
        Feedback__c feedback2 = new Feedback__c(
            Name = 'Feedback 2', 
            Rating__c = 4, 
            Comment__c = 'Good', 
            Account__c = acc.Id, 
            Contact__c = con.Id
        );
        insert new List<Feedback__c>{feedback1, feedback2};

        // Delete one of the Feedback records
        delete feedback1;

        // Verify that average ratings are updated for Account and Contact
        acc = [SELECT Id, Average_Rating__c FROM Account WHERE Id = :acc.Id];
        con = [SELECT Id, Average_Rating__c FROM Contact WHERE Id = :con.Id];

        // After deletion, average rating should be 4 (from the remaining feedback)
        System.assertEquals(4, acc.Average_Rating__c, 'Account Average Rating should be 4');
        System.assertEquals(4, con.Average_Rating__c, 'Contact Average Rating should be 4');
    }
}
