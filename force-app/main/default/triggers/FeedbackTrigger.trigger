trigger FeedbackTrigger on Feedback__c (after insert, after update, after delete) {
    if (Trigger.isAfter) {
        FeedbackTriggerHandler.afterOperation(Trigger.oldMap, Trigger.newMap, Trigger.operationType);
    }
}