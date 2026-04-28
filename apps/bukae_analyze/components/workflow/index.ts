/**
 * Analyze workflow execution map
 *
 * app/(shell)/layout.tsx
 *   -> components/layout/AppShell
 *      -> AnalyzeWorkflowProgressSidebar
 *         - Renders the left progress rail for the analyze workflow.
 *         - Shows AnalyzeWorkflowStepList.
 *         - Opens the previous workflow step with preserved project/planning query.
 *
 *      -> AnalyzeWorkflowNextStepSidebar
 *         - Renders the right next-step button.
 *         - Delegates all next-step behavior to useAnalyzeWorkflowNextStep.
 *
 * AnalyzeWorkflowNextStepSidebar
 *   -> useAnalyzeWorkflowNextStep
 *      - Reads the active workflow step from the route.
 *      - Decides whether the next button should render or be disabled.
 *      - Advances the current step:
 *
 *        /analysis
 *          -> route only
 *          -> /planning-setup
 *
 *        /planning-setup
 *          -> validate planning setup answers
 *          -> submit intake when the current draft has not been submitted
 *          -> route to /ai-planning
 *
 *        /ai-planning?mode=default
 *          -> enter follow-up chatbot workspace when PT1 needs more detail
 *          -> route to /ai-planning?mode=chatbot
 *
 *        /ai-planning?mode=chatbot
 *          -> start shooting-guide generation when a brief is ready
 *          -> route to /shooting-guide
 *
 *        /shooting-guide
 *          -> final workflow step
 *          -> next button hidden
 *
 * Shared helpers
 *   -> analyzeWorkflowSteps
 *      - Defines the workflow step list.
 *      - Builds step URLs with project/planning query.
 *      - Resolves the current step index from pathname.
 *
 * Planned split
 *   -> useAnalyzeWorkflowRouteState
 *      - Route/query/step derivation.
 *
 *   -> usePlanningSetupStepSubmission
 *      - Planning setup validation and submit-once behavior.
 *
 *   -> useAiPlanningStepAdvance
 *      - Chatbot workspace entry and shooting-guide generation start.
 *
 *   -> store/useAnalyzeWorkflowStore
 *      - Mutation cache for submitted intake drafts, chatbot sessions,
 *        and generation requests.
 */
