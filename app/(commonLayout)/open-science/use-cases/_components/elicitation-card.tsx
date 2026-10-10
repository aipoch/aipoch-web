import { Check, CircleHelp } from 'lucide-react'
import type { TranscriptItem } from '@/lib/use-case-types'

type ElicitationItem = Extract<TranscriptItem, { type: 'elicitation' }>

type ElicitationOption = {
  value: string
  label: string
  description?: string
}

type ElicitationField = {
  id: string
  label: string
  description?: string
  kind: string
  options?: ElicitationOption[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asFields = (fields: unknown[]): ElicitationField[] =>
  fields.filter(isRecord).map((field, index) => ({
    id: typeof field.id === 'string' ? field.id : `field-${index}`,
    label: typeof field.label === 'string' ? field.label : 'Question',
    description: typeof field.description === 'string' ? field.description : undefined,
    kind: typeof field.kind === 'string' ? field.kind : 'text',
    options: Array.isArray(field.options)
      ? field.options.filter(isRecord).map((option) => ({
          value: typeof option.value === 'string' ? option.value : String(option.value ?? ''),
          label: typeof option.label === 'string' ? option.label : String(option.value ?? ''),
          description: typeof option.description === 'string' ? option.description : undefined
        }))
      : undefined
  }))

// Mirror of the app's answered elicitation review: the selected option (or the
// custom free-form answer) is highlighted with a primary check, everything
// else renders as numbered, unselected rows.
export const SessionElicitationCard = ({ item }: { item: ElicitationItem }) => {
  const fields = asFields(item.fields)
  const answers = item.state === 'answered' ? (item.answers ?? []) : []
  const answerFor = (fieldId: string): unknown =>
    answers.find((answer) => answer.fieldId === fieldId)?.value
  const isSelected = (answer: unknown, optionValue: string): boolean =>
    answer === optionValue || (Array.isArray(answer) && answer.includes(optionValue))

  return (
    <div className="px-4 pb-1 pt-3 md:px-6">
      <div className="w-full max-w-[56rem] rounded-[14px] bg-bg-200/70 px-1.5 py-1">
        <div className="rounded-[10px] bg-bg-000/60 p-3">
          <div className="flex items-center gap-2">
            <span className="grid size-[22px] shrink-0 place-items-center text-primary">
              <CircleHelp className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </span>
            <h3 className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-semibold leading-5 text-text-000">
              {item.message}
            </h3>
          </div>
          <div className="mt-3 space-y-4">
            {fields.map((field) => {
              const answer = answerFor(field.id)
              return (
                <fieldset key={field.id} className="space-y-2">
                  <legend className="text-sm font-medium text-text-000">{field.label}</legend>
                  {field.description && field.description !== item.message ? (
                    <p className="text-sm leading-5 text-text-100">{field.description}</p>
                  ) : null}
                  {field.kind === 'single-select' || field.kind === 'multi-select' ? (
                    <div>
                      {field.options?.map((option, index) => {
                        const selected = isSelected(answer, option.value)
                        return (
                          <div
                            key={option.value}
                            data-selected={selected ? 'true' : 'false'}
                            className={`flex w-full items-start gap-2 rounded-md px-1 py-1.5 text-left ${selected ? 'bg-bg-200' : ''}`}
                          >
                            <span
                              className={`mt-px grid size-5 shrink-0 place-items-center rounded-md text-xs font-medium shadow-sm ${
                                selected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-bg-200 text-text-100'
                              }`}
                            >
                              {selected ? (
                                <Check className="size-3" strokeWidth={2} aria-label="Selected" />
                              ) : (
                                index + 1
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block break-words text-[13px] font-medium leading-[18px] text-text-000">
                                {option.label}
                              </span>
                              {option.description ? (
                                <span className="mt-px block whitespace-pre-wrap break-words text-xs leading-4 text-text-100">
                                  {option.description}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : typeof answer === 'string' && answer ? (
                    <div
                      data-selected="true"
                      className="flex w-full items-start gap-2 rounded-md bg-bg-200 px-1 py-1.5 text-left"
                    >
                      <span className="mt-px grid size-5 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
                        <Check className="size-3" strokeWidth={2} aria-label="Selected" />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-[13px] font-medium leading-[18px] text-text-000">
                        {answer}
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border-200 bg-bg-000/60 p-3 text-sm italic text-text-300">
                      Free-form answer
                    </div>
                  )}
                </fieldset>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
