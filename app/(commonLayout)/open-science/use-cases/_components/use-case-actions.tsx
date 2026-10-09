import Link from 'next/link'

export const UseCaseActions = ({ slug, packageUrl }: { slug: string; packageUrl?: string }) => (
  <>
    {packageUrl ? (
      <a
        href={packageUrl}
        className="inline-flex min-h-11 items-center border border-[#10110f] bg-white px-5 text-[13px] font-semibold text-[#10110f] transition-colors hover:bg-[#10110f] hover:text-white"
      >
        Download research package
      </a>
    ) : null}
    <Link
      href={`/open-science/use-cases/${slug}/replay`}
      className="inline-flex min-h-11 items-center border border-[#10110f] bg-white px-5 text-[13px] font-semibold text-[#10110f] transition-colors hover:bg-[#10110f] hover:text-white active:bg-white active:text-[#10110f]"
    >
      View the research session
    </Link>
  </>
)
