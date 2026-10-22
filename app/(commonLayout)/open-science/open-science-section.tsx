import type { ReactNode } from 'react'

export const openScienceContainer = 'mx-auto w-full max-w-[1230px] px-6'
export const openScienceHeading =
  'font-[Georgia,serif] text-[36px] font-normal leading-[1.1] tracking-normal sm:text-[44px] lg:text-[56px]'
export const openScienceAction =
  'inline-flex min-h-10 items-center justify-center gap-2 border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111]'

export function OpenScienceSectionHeading({
  eyebrow,
  title,
  children,
  supportingContent
}: {
  eyebrow: string
  title: ReactNode
  children: ReactNode
  supportingContent?: ReactNode
}) {
  return (
    <div data-open-science-reveal="" className="mx-auto mb-12 max-w-[950px] text-center lg:mb-16">
      <span className="relative inline-block bg-[#e9e9e7] px-2 py-1 font-mono text-[10px] leading-4 uppercase before:absolute before:-top-px before:-left-1 before:size-1 before:bg-[#999]">
        {eyebrow}
      </span>
      <h2 className={`${openScienceHeading} mx-auto mt-6 max-w-[900px]`}>{title}</h2>
      <p className="mx-auto mt-6 max-w-[800px] text-base leading-[26px] text-[#6b6b66]">
        {children}
      </p>
      {supportingContent ? (
        <p className="mx-auto mt-4 max-w-[800px] text-sm leading-6 text-[#6b6b66]">
          {supportingContent}
        </p>
      ) : null}
    </div>
  )
}
