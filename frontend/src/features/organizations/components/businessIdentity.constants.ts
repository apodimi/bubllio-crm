import type { SettingsFieldGroup } from './settings.types'

export const businessIdentityGroups: SettingsFieldGroup[] = [
  {
    title: 'Business names',
    description: 'The names customers and official documents use.',
    fields: [
      { name: 'legal_name', label: 'Legal business name' },
      { name: 'trading_name', label: 'Trading name' },
    ],
  },
  {
    title: 'Registration',
    description: 'Tax and registry identifiers for commercial documents.',
    fields: [
      { name: 'tax_id', label: 'Tax / VAT number' },
      { name: 'tax_office', label: 'Tax office' },
      { name: 'registration_number', label: 'Registration number', wide: true },
    ],
  },
  {
    title: 'Contact details',
    description: 'Public contact information and registered address.',
    fields: [
      { name: 'business_email', label: 'Business email', type: 'email' },
      { name: 'phone', label: 'Phone' },
      { name: 'website', label: 'Website', type: 'url', wide: true },
      { name: 'address_line_1', label: 'Address', wide: true },
      { name: 'address_line_2', label: 'Address line 2', wide: true },
      { name: 'city', label: 'City' },
      { name: 'postal_code', label: 'Postal code' },
      {
        name: 'country',
        label: 'Country code',
        helper: 'Use two letters, for example GR.',
      },
    ],
  },
]
