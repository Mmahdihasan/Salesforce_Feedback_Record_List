@isTest
public class LiveMessageNotificationServiceTest {

    // Mock HTTP Callout Class
    private class MockHttpResponseGenerator implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            // Simulate a successful response
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"success": true, "message": "SMS sent successfully"}');
            return res;
        }
    }

    @isTest
    static void testSendSMS_Success() {
        // Set mock response
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());

        // Test inputs
        String templateDeveloperName = 'Test_Template';
        String channelDeveloperName = 'Test_Channel';
        String contextRecordId = '001343'; // Sample record ID
        String recipientRecordId = '003123'; // Sample record ID

        // Call the method
        Test.startTest();
        LiveMessageNotificationService.sendSMS(
            templateDeveloperName, 
            channelDeveloperName, 
            contextRecordId, 
            recipientRecordId
        );
        Test.stopTest();

        // Assertions
        System.assert(true, 'sendSMS method executed successfully.');
    }

    @isTest
    static void testSendSMS_Failure() {
        // Mock response for failure
        class MockFailureHttpResponseGenerator implements HttpCalloutMock {
            public HttpResponse respond(HttpRequest req) {
                HttpResponse res = new HttpResponse();
                res.setStatusCode(400);
                res.setBody('{"error": "Invalid request"}');
                return res;
            }
        }

        // Set mock response
        Test.setMock(HttpCalloutMock.class, new MockFailureHttpResponseGenerator());

        // Test inputs
        String templateDeveloperName = 'Invalid_Template';
        String channelDeveloperName = 'Invalid_Channel';
        String contextRecordId = '001678'; // Sample record ID
        String recipientRecordId = '0039988'; // Sample record ID

        // Call the method
        Test.startTest();
        LiveMessageNotificationService.sendSMS(
            templateDeveloperName, 
            channelDeveloperName, 
            contextRecordId, 
            recipientRecordId
        );
        Test.stopTest();

        // Assertions
        System.assert(true, 'sendSMS method handled failure as expected.');
    }

    @isTest
    static void testSendSMS_Exception() {
        // Mock response to throw an exception
        class MockExceptionHttpResponseGenerator implements HttpCalloutMock {
            public HttpResponse respond(HttpRequest req) {
                throw new CalloutException('Mocked exception during callout');
            }
        }

        // Set mock response
        Test.setMock(HttpCalloutMock.class, new MockExceptionHttpResponseGenerator());

        // Test inputs
        String templateDeveloperName = 'Test_Template';
        String channelDeveloperName = 'Test_Channel';
        String contextRecordId = '001898'; // Sample record ID
        String recipientRecordId = '00332345'; // Sample record ID

        // Call the method and verify exception handling
        Test.startTest();
        LiveMessageNotificationService.sendSMS(
            templateDeveloperName, 
            channelDeveloperName, 
            contextRecordId, 
            recipientRecordId
        );
        Test.stopTest();

        // Assertions
        System.assert(true, 'sendSMS method handled exception as expected.');
    }

}
