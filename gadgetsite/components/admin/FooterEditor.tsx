'use client'
import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ActionState } from '@/lib/admin/action'
import { SOCIAL_NETWORKS, type FooterSettings } from '@/lib/content/schemas'
import { ui } from '@/lib/ui'

type Props = {
  action: (p: ActionState, f: FormData) => Promise<ActionState>
  footer: FooterSettings
}
let seq = 0
const keyed = <T,>(xs: T[]) => xs.map((x) => ({ k: ++seq, ...x }))

export default function FooterEditor({ action, footer }: Props) {
  const t = useTranslations('admin.footer')
  const ta = useTranslations('admin')
  const [state, formAction, pending] = useActionState(action, {})
  const [columns, setColumns] = useState(() =>
    keyed(footer.columns.map((c) => ({ ...c, links: keyed(c.links) }))),
  )
  const [branches, setBranches] = useState(() => keyed(footer.branches))
  const [socials, setSocials] = useState(() => keyed(footer.socials))
  const [apps, setApps] = useState(() => keyed(footer.appLinks))

  const bad = (name: string) => !!state.fieldErrors?.[name]
  const inp = (name: string, value: string | undefined, placeholder: string, extra = '') => (
    <input
      name={name}
      defaultValue={value ?? ''}
      placeholder={placeholder}
      aria-label={placeholder}
      aria-invalid={bad(name)}
      className={`${ui.input} !p-2 aria-[invalid=true]:border-red-500 ${extra}`}
    />
  )
  const removeBtn = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 text-red-300 hover:bg-red-500/10"
      aria-label={ta('remove')}
    >
      ✕
    </button>
  )
  const addBtn = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className={`${ui.btnGhost} !px-3 !py-1.5 text-[13px]`}>
      + {label}
    </button>
  )
  const section = 'grid gap-3 rounded-2xl bg-pn p-4 min-[701px]:p-5'

  return (
    <form action={formAction} className="grid gap-5" data-testid="footer-editor">
      <section className={section}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('columns')}</h2>
          {addBtn(t('addColumn'), () =>
            setColumns((c) => [
              ...c,
              {
                k: ++seq,
                title: { en: '', bn: '' },
                links: keyed([{ label: { en: '', bn: '' }, href: '' }]),
              },
            ]),
          )}
        </div>
        {columns.map((c, i) => (
          <div key={c.k} className="grid animate-rise gap-2 rounded-xl border border-white/5 p-3">
            <div className="flex gap-2">
              {inp(`columns.${i}.title.en`, c.title.en, t('titleEn'))}
              {inp(`columns.${i}.title.bn`, c.title.bn, t('titleBn'))}
              {removeBtn(() => setColumns((cs) => cs.filter((x) => x.k !== c.k)))}
            </div>
            {c.links.map((l, j) => (
              <div key={l.k} className="grid gap-2 pl-3 min-[701px]:grid-cols-[1fr_1fr_1.2fr_auto]">
                {inp(`columns.${i}.links.${j}.label.en`, l.label.en, t('labelEn'))}
                {inp(`columns.${i}.links.${j}.label.bn`, l.label.bn, t('labelBn'))}
                {inp(`columns.${i}.links.${j}.href`, l.href, t('href'))}
                {removeBtn(() =>
                  setColumns((cs) =>
                    cs.map((x) =>
                      x.k === c.k ? { ...x, links: x.links.filter((y) => y.k !== l.k) } : x,
                    ),
                  ),
                )}
              </div>
            ))}
            <div className="pl-3">
              {addBtn(t('addLink'), () =>
                setColumns((cs) =>
                  cs.map((x) =>
                    x.k === c.k
                      ? {
                          ...x,
                          links: [...x.links, { k: ++seq, label: { en: '', bn: '' }, href: '' }],
                        }
                      : x,
                  ),
                ),
              )}
            </div>
          </div>
        ))}
      </section>

      <section className={section}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('branches')}</h2>
          {addBtn(t('addBranch'), () =>
            setBranches((b) => [
              ...b,
              {
                k: ++seq,
                name: { en: '', bn: '' },
                address: { en: '', bn: '' },
                phone: '',
                mapUrl: '',
              },
            ]),
          )}
        </div>
        {branches.map((b, i) => (
          <div
            key={b.k}
            className="grid animate-rise gap-2 rounded-xl border border-white/5 p-3 min-[701px]:grid-cols-2"
          >
            {inp(`branches.${i}.name.en`, b.name.en, t('branchNameEn'))}
            {inp(`branches.${i}.name.bn`, b.name.bn, t('branchNameBn'))}
            {inp(
              `branches.${i}.address.en`,
              b.address.en,
              t('addressEn'),
              'min-[701px]:col-span-2',
            )}
            {inp(
              `branches.${i}.address.bn`,
              b.address.bn,
              t('addressBn'),
              'min-[701px]:col-span-2',
            )}
            {inp(`branches.${i}.phone`, b.phone, t('phone'))}
            <div className="flex gap-2">
              {inp(`branches.${i}.mapUrl`, b.mapUrl, t('mapUrl'))}
              {removeBtn(() => setBranches((bs) => bs.filter((x) => x.k !== b.k)))}
            </div>
          </div>
        ))}
      </section>

      <section className={`${section} min-[1101px]:grid-cols-2`}>
        <div className="grid content-start gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('socials')}</h2>
            {addBtn(t('add'), () =>
              setSocials((s) => [...s, { k: ++seq, network: 'facebook', url: '' }]),
            )}
          </div>
          {socials.map((s, i) => (
            <div key={s.k} className="flex animate-rise gap-2">
              <select
                name={`socials.${i}.network`}
                defaultValue={s.network}
                className={`${ui.input} !w-36 !p-2`}
              >
                {SOCIAL_NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {inp(`socials.${i}.url`, s.url, 'https://…')}
              {removeBtn(() => setSocials((ss) => ss.filter((x) => x.k !== s.k)))}
            </div>
          ))}
        </div>
        <div className="grid content-start gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('apps')}</h2>
            {apps.length < 2 &&
              addBtn(t('add'), () =>
                setApps((a) => [...a, { k: ++seq, store: 'google_play', url: '' }]),
              )}
          </div>
          {apps.map((a, i) => (
            <div key={a.k} className="flex animate-rise gap-2">
              <select
                name={`appLinks.${i}.store`}
                defaultValue={a.store}
                className={`${ui.input} !w-36 !p-2`}
              >
                <option value="google_play">Google Play</option>
                <option value="app_store">App Store</option>
              </select>
              {inp(`appLinks.${i}.url`, a.url, 'https://…')}
              {removeBtn(() => setApps((as) => as.filter((x) => x.k !== a.k)))}
            </div>
          ))}
        </div>
      </section>

      <section className={`${section} min-[701px]:grid-cols-2`}>
        <h2 className="font-semibold min-[701px]:col-span-2">{t('copyright')}</h2>
        {inp('copyright.en', footer.copyright.en, t('titleEn'))}
        {inp('copyright.bn', footer.copyright.bn, t('titleBn'))}
      </section>

      <div className="bg-bg/95 sticky bottom-0 flex items-center gap-3 border-t border-white/5 py-3 backdrop-blur">
        <button type="submit" disabled={pending} className={ui.btn}>
          {ta('save')}
        </button>
        {state.ok && (
          <span role="status" className="animate-fi text-ok">
            {ta('saved')}
          </span>
        )}
        {state.fieldErrors && (
          <span role="alert" className="text-red-400">
            {ta('err.invalid_value')}
          </span>
        )}
      </div>
    </form>
  )
}
