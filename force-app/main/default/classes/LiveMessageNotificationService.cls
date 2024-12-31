public with sharing class LiveMessageNotificationService {

    public static void sendSMS(String templateDeveloperName, String channelDeveloperName, String contextRecordId, String recipientRecordId) {
        // Construct the endpoint URL
        String endpoint = URL.getOrgDomainUrl() + '/services/data/v43.0/actions/standard/liveMessageNotification';

        // Prepare the JSON request body
        Map<String, Object> payload = new Map<String, Object>{
            'inputs' => new List<Map<String, Object>>{
                new Map<String, Object>{
                    'templateDeveloperName' => templateDeveloperName,
                    'channelDeveloperName' => channelDeveloperName,
                    'contextRecordId' => contextRecordId,
                    'recipientRecordId' => recipientRecordId
                }
            }
        };
        String body = JSON.serialize(payload);

        // Configure the HTTP request
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('POST');
        req.setHeader('Authorization', 'Bearer ' + UserInfo.getSessionId());
        req.setHeader('Content-Type', 'application/json');
        req.setBody(body);

        // Execute the HTTP request
        Http http = new Http();
        HttpResponse res;
        try {
            res = http.send(req);
            if (res.getStatusCode() == 200) {
                System.debug('SMS sent successfully. Response: ' + res.getBody());
            } else {
                System.debug('Failed to send SMS. Status: ' + res.getStatusCode() + ', Body: ' + res.getBody());
            }
        } catch (Exception ex) {
            System.debug('Exception occurred while sending SMS: ' + ex.getMessage());
        }
    }
}