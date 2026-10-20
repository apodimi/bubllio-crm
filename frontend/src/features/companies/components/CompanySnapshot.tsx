import { useTranslation } from 'react-i18next'

import { RecordMetricStrip } from '../../../components/common/RecordMetricStrip'

interface CompanySnapshotProps {
  owner: string
  primaryContact: string
  activeServices: string
  nextBilling: string
  contactsPending: boolean
  contactsError: boolean
  subscriptionsPending: boolean
  subscriptionsError: boolean
}

export function CompanySnapshot({
  owner,
  primaryContact,
  activeServices,
  nextBilling,
  contactsPending,
  contactsError,
  subscriptionsPending,
  subscriptionsError,
}: CompanySnapshotProps) {
  const { t } = useTranslation()

  return (
    <RecordMetricStrip
      title={t('crm.companies.detail.snapshotTitle')}
      titleId="customer-snapshot-heading"
      appearance="ruled"
      items={[
        { key: 'owner', label: t('crm.companies.detail.snapshot.owner'), value: owner },
        {
          key: 'primary-contact',
          label: t('crm.companies.detail.snapshot.primaryContact'),
          value: primaryContact,
          pending: contactsPending,
          error: contactsError,
        },
        {
          key: 'active-services',
          label: t('crm.companies.detail.snapshot.activeServices'),
          value: activeServices,
          pending: subscriptionsPending,
          error: subscriptionsError,
        },
        {
          key: 'next-billing',
          label: t('crm.companies.detail.snapshot.nextBilling'),
          value: nextBilling,
          pending: subscriptionsPending,
          error: subscriptionsError,
        },
      ]}
    />
  )
}
