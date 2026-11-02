import { revalidateLogic } from '@tanstack/react-form'

/** Validate on submit, then on every change once the user has tried to submit (like the design). */
export const submitThenChange = revalidateLogic({ mode: 'submit', modeAfterSubmission: 'change' })
