'use client'

import { useForm } from 'react-hook-form'
import { CdnImage as Image } from '@/components/cdn-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SUPPORT_EMAIL } from '@/lib/config'
import { staticAsset } from '@/lib/staticAsset'
import { cn } from '@/lib/utils'

type ContactFormValues = {
  name: string
  email: string
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELD_LABEL_CLASS =
  'mb-2 block font-mono text-[12px] font-bold tracking-[0.28em] text-black/55'
const INPUT_CLASS =
  'h-14 rounded-[4px] border-black/10 bg-white/85 px-5 text-base shadow-none placeholder:text-black/25 focus-visible:border-black/40 focus-visible:ring-black/10 md:text-base'
const INVALID_FIELD_CLASS =
  'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/15'

function buildMailtoUrl(values: ContactFormValues) {
  const body = [
    'NAME / COMPANY',
    values.name.trim() || '',
    '',
    'EMAIL',
    values.email.trim(),
    '',
    'MESSAGE',
    values.message.trim()
  ].join('\n')

  return `mailto:${SUPPORT_EMAIL}?body=${encodeURIComponent(body)}`
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p
      id={id}
      aria-hidden={!message}
      className={cn(
        'mt-1.5 min-h-5 text-sm font-medium text-red-600 transition-opacity',
        message ? 'opacity-100' : 'opacity-0'
      )}
    >
      {message}
    </p>
  )
}

export default function ContactUsPage() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ContactFormValues>({
    defaultValues: {
      name: '',
      email: '',
      message: ''
    }
  })

  const onSubmit = (values: ContactFormValues) => {
    window.location.href = buildMailtoUrl(values)
  }

  return (
    <main
      className={cn(
        'flex flex-1 bg-[#e8e8e8]',
        'bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-size-[60px_60px]'
      )}
    >
      <section className="mx-auto grid w-full max-w-7xl items-stretch gap-10 px-6 py-16 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:px-8 lg:py-24">
        <div className="relative hidden min-h-[760px] overflow-hidden lg:block lg:h-full">
          <Image
            src={staticAsset('contact-9d2c04ba.webp')}
            alt="Microscope in a laboratory"
            fill
            priority
            sizes="(min-width: 1024px) 38vw, 0vw"
            className="object-cover grayscale"
          />
        </div>

        <div className="flex h-full w-full flex-col justify-between gap-10 pt-0">
          <div>
            <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-black/45">
              AIPOCH / SUPPORT
            </p>
            <h1 className="max-w-3xl text-4xl font-normal leading-[1.04] tracking-[-0.045em] text-black md:text-4xl lg:text-6xl">
              We&apos;re always open to hearing from you.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-black/55">
              If you&apos;re exploring AIPOCH or have thoughts to share, don&apos;t hesitate to get
              in touch.
            </p>
          </div>

          <form className="space-y-3.5" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="name" className={FIELD_LABEL_CLASS}>
                Name / Company
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter name"
                className={cn(INPUT_CLASS, 'mb-6')}
                {...register('name', {
                  setValueAs: (value: string) => value.trim()
                })}
              />
            </div>

            <div>
              <label htmlFor="email" className={FIELD_LABEL_CLASS}>
                Email *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={cn(INPUT_CLASS, errors.email && INVALID_FIELD_CLASS)}
                {...register('email', {
                  setValueAs: (value: string) => value.trim(),
                  required: 'Email is required',
                  pattern: {
                    value: EMAIL_PATTERN,
                    message: 'Please enter a valid email address'
                  }
                })}
              />
              <FieldError id="email-error" message={errors.email?.message} />
            </div>

            <div>
              <label htmlFor="message" className={FIELD_LABEL_CLASS}>
                Message *
              </label>
              <Textarea
                id="message"
                placeholder="How can we help?"
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'message-error' : undefined}
                className={cn(
                  'min-h-40 resize-none rounded-[4px] border-black/10 bg-white/85 px-5 py-4 text-base shadow-none placeholder:text-black/25 focus-visible:border-black/40 focus-visible:ring-black/10 md:text-base',
                  errors.message && INVALID_FIELD_CLASS
                )}
                {...register('message', {
                  setValueAs: (value: string) => value.trim(),
                  required: 'Message is required'
                })}
              />
              <FieldError id="message-error" message={errors.message?.message} />
            </div>

            <Button
              type="submit"
              className="h-14 w-full rounded-none bg-black font-mono text-[13px] font-normal tracking-wide text-white shadow-none hover:bg-black/85"
            >
              Submit
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
