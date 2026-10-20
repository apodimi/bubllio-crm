# Bubllio CRM pilot roadmap

Το παρόν roadmap περιγράφει τι χρειάζεται το Bubllio για να δοκιμαστεί από
πραγματικούς πελάτες. Δεν είναι λίστα πιθανών ιδεών. Είναι η συμφωνημένη σειρά
με την οποία ολοκληρώνουμε τα βασικά καθημερινά workflows ενός CRM.

## Στόχος του pilot

Ένας μικρός οργανισμός, agency, IT provider ή MSP πρέπει να μπορεί να:

1. οργανώσει εταιρείες και ανθρώπους,
2. παρακολουθήσει ευκαιρίες πώλησης,
3. γνωρίζει ποια ενέργεια πρέπει να γίνει στη συνέχεια,
4. διαχειριστεί τις ενεργές υπηρεσίες των πελατών του,
5. γνωρίζει ποιες επαναλαμβανόμενες χρεώσεις λήγουν ή καθυστερούν,
6. λειτουργήσει με ασφάλεια σε self-hosted εγκατάσταση.

## Τι λειτουργεί ήδη

- Workspaces, invitations, memberships και role-based permissions.
- Tenant isolation για organization-owned δεδομένα.
- Companies με customer code, owner, lifecycle stage, archive και activity.
- Contacts με company, owner, primary contact, archive και activity.
- Deals με pipeline, drag and drop, status, owner, contact, probability,
  ημερομηνία κλεισίματος, ΦΠΑ και lost reason.
- Tasks και follow-ups με company/contact/deal, owner, due time, reminder,
  priority, date-based list, workflow board με drag and drop και next action στα
  deals.
- Services, subscriptions, renewals, εσωτερικές χρεώσεις και recurring revenue.
- Actionable Overview με προσωπικά tasks, overdue follow-ups και billing attention.
- Organization και ERP defaults.
- SMTP account configuration.
- Installation administration, production-readiness checks, backup status,
  local data export και GitHub update notifications.
- Business και technical documentation για τα παραπάνω.

## P0 — Απαραίτητα για pilot

### 1. Ενιαίο customer και deal timeline

Χρονολογική προβολή αλλαγών, notes, completed tasks, contacts, deals και
services/payments. Το timeline πρέπει να διαχωρίζει system events από ανθρώπινες
ενέργειες και να μην αποθηκεύει ευαίσθητες παλιές τιμές χωρίς λόγο.

**Αποτέλεσμα:** οποιοδήποτε μέλος της ομάδας καταλαβαίνει άμεσα τι έχει συμβεί
με έναν πελάτη.

### 2. Global search

Αναζήτηση σε companies, customer codes, contacts, email, τηλέφωνο και deals,
πάντα μέσα στα επιτρεπόμενα workspaces του χρήστη.

**Αποτέλεσμα:** γρήγορη πρόσβαση σε εγγραφές χωρίς αναζήτηση σε διαφορετικές
σελίδες.

### 3. CSV import

Import companies και contacts με preview, mapping στηλών, validation, duplicate
checks, error report και αναγνωρίσιμο import batch.

**Αποτέλεσμα:** ένας pilot πελάτης μπορεί να ξεκινήσει με τα υπάρχοντα δεδομένα
του χωρίς χειροκίνητη επανεισαγωγή.

## P1 — Διαφοροποίηση και καθημερινή αξία

### 4. Saved views και My work

**Υλοποιήθηκε η πρώτη έκδοση:** το Overview έγινε My work και συγκεντρώνει τις
σημερινές εργασίες, τα deals χωρίς επόμενο βήμα και όσα κλείνουν μέσα στον μήνα.
Τα built-in views για deals και tasks είναι server-filtered, αποθηκεύονται στο URL
και μπορούν να γίνουν bookmark χωρίς αλλαγή στα υπάρχοντα routes. Custom
ονομασμένα views, my companies και renewals παραμένουν μελλοντική επέκταση.

### 5. Deal profile

**Υλοποιήθηκε η πρώτη έκδοση:** canonical σελίδα deal με εμπορικά στοιχεία,
συνδεδεμένη εταιρεία/επαφή/owner, σημειώσεις και υπάρχοντα next actions. Από τη
σελίδα μπορούν να προστεθούν, επεξεργαστούν και ολοκληρωθούν tasks, ενώ το
υπάρχον drawer παραμένει το γρήγορο create/edit flow και τα παλιά drawer URLs
παραμένουν συμβατά. Immutable deal timeline και stage history παραμένουν
μελλοντική επέκταση και δεν παρουσιάζονται ως υλοποιημένα.

## Εκτός pilot

- AI lead scoring και γενικές AI λειτουργίες χωρίς μετρήσιμη ανάγκη.
- Marketing campaigns και mass email marketing.
- Helpdesk/ticketing.
- Επίσημη τιμολόγηση, λογιστικές εγγραφές και myDATA.
- Advanced forecasting, quotas και territory management.
- Custom field builder και πλήρως παραμετροποιήσιμα pipelines.
- Multiple price books και CPQ.
- Unified Inbox / Communication Hub: read-only inbox και threads, σύνδεση με
  company/contact timeline, ασφαλές send/reply, assignments, reminders και
  templates. Παραμένει post-pilot TODO και δεν θεωρείται υλοποιημένο.
- Native mobile εφαρμογή.

Αυτά μπορούν να επανεκτιμηθούν μετά από πραγματικό pilot feedback.

## Συμφωνημένη σειρά

```text
Unified timeline
  -> Global search
  -> CSV import
  -> Saved views + My work
  -> Deal profile
  -> Pilot hardening and onboarding
```

Η σειρά μπορεί να αλλάξει μόνο όταν pilot πελάτης επιβεβαιώσει ότι διαφορετικό
workflow είναι σημαντικότερο. Το scope δεν αλλάζει επειδή ένα feature υπάρχει σε
άλλο CRM.

## Definition of Done

Κάθε feature θεωρείται ολοκληρωμένο μόνο όταν διαθέτει:

- σύντομο business problem και user flow,
- σαφή in-scope και out-of-scope συμπεριφορά,
- documented domain model και tenant ownership,
- permissions και cross-tenant validation,
- migrations για κάθε αλλαγή μοντέλου,
- business logic σε services/models και όχι σε φορτωμένα views,
- API tests για success, validation, permissions και tenant isolation,
- frontend loading, empty, error, disabled και success states,
- responsive και keyboard-accessible interaction,
- χρήση ώριμων UI libraries αντί για custom primitives όπου υπάρχει κατάλληλη
  λύση,
- Django checks, migration consistency, regression tests, frontend lint και
  production build,
- ενημερωμένο technical και non-technical documentation,
- gitmoji commit με καθαρό working tree.

## Κανόνας ποιότητας

Δεν ξεκινά implementation πριν συμφωνηθούν το πρόβλημα, τα δεδομένα, τα edge
cases και τα acceptance criteria. Δεν χαρακτηρίζουμε planned δυνατότητα ως
λειτουργική και δεν επεκτείνουμε σιωπηρά το προϊόν σε accounting, support ή
marketing system.
