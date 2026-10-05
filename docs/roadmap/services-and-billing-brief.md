# Services, subscriptions and billing brief

## Το πρόβλημα

Μετά από ένα `Won` deal, η ομάδα πρέπει να γνωρίζει τι αγόρασε ο πελάτης, αν η
υπηρεσία είναι ενεργή, πότε ανανεώνεται και ποια χρέωση πρέπει να πληρωθεί.

Παραδείγματα:

- hosting με μηνιαία πληρωμή,
- domain με ετήσια ανανέωση,
- website maintenance ανά τρίμηνο,
- Microsoft 365 licenses ανά μήνα,
- ετήσιο support contract,
- εφάπαξ installation ή consulting service.

## Ονομασία στο προϊόν

Το βασικό navigation item ονομάζεται **Services**. Στη σελίδα της εταιρείας
εμφανίζεται ενότητα **Services & billing**.

Οι βασικοί όροι είναι:

- **Service:** τι πουλάει η επιχείρηση στον κατάλογό της.
- **Customer service:** η συγκεκριμένη συμφωνία ενός πελάτη για μία υπηρεσία.
- **Charge:** ένα ποσό που αναμένεται να πληρωθεί σε συγκεκριμένη ημερομηνία.
- **Payment:** η καταγραφή ότι εισπράχθηκε όλο ή μέρος μιας χρέωσης.
- **Renewal:** η ημερομηνία κατά την οποία η υπηρεσία ανανεώνεται ή λήγει.

Δεν χρησιμοποιούμε τον όρο `Invoice` στην πρώτη έκδοση, επειδή δεν εκδίδουμε
επίσημο φορολογικό παραστατικό.

## Προτεινόμενο domain model

```text
Organization
  -> ServiceCatalogItem
  -> Company
       -> CustomerService
            -> Charge
                 -> Payment
```

### ServiceCatalogItem

Reusable κατάλογος προϊόντων και υπηρεσιών ενός organization:

- name και description,
- internal code/SKU προαιρετικά,
- default net price,
- currency,
- default VAT rate,
- one-off ή recurring,
- default billing interval,
- active/inactive.

### CustomerService

Η πραγματική συμφωνία με συγκεκριμένη company:

- catalog item και προαιρετικό originating deal,
- custom display name,
- agreed net price, VAT και currency,
- one-off/monthly/quarterly/semiannual/annual/custom cycle,
- start date,
- next billing date,
- renewal/end date,
- auto-renew flag,
- active/paused/cancelled/expired status,
- assigned owner,
- operational reference, π.χ. domain ή hosting account,
- internal notes.

Η τιμή αντιγράφεται στη customer service και δεν διαβάζεται δυναμικά από τον
κατάλογο. Μελλοντική αλλαγή της default τιμής δεν πρέπει να αλλάξει υπάρχουσες
συμφωνίες.

### Charge

Μία αναμενόμενη χρέωση:

- service,
- coverage period,
- due date,
- immutable net, VAT και gross snapshots,
- upcoming/due/overdue/partially_paid/paid/waived/cancelled status,
- paid amount και outstanding amount ως derived values.

Οι παλιές χρεώσεις δεν επανυπολογίζονται όταν αλλάξει η υπηρεσία.

### Payment

Μία πραγματική είσπραξη που αντιστοιχεί σε charge:

- amount και paid date,
- payment method,
- external reference,
- note,
- recorded_by και timestamps.

Δεν αποθηκεύουμε απλό boolean `paid`. Επιτρέπουμε περισσότερες από μία πληρωμές
ώστε να υποστηρίζονται partial payments και διορθώσεις χωρίς απώλεια ιστορικού.

## Βασικά workflows

### Προσθήκη ενεργής υπηρεσίας

1. Ο χρήστης ανοίγει company.
2. Επιλέγει service από τον κατάλογο ή δημιουργεί custom customer service.
3. Επιβεβαιώνει τιμή, ΦΠΑ, billing cycle και πρώτη ημερομηνία χρέωσης.
4. Το σύστημα δημιουργεί μόνο την πρώτη charge, όχι απεριόριστες μελλοντικές
   εγγραφές.

### Καταγραφή πληρωμής

1. Ο χρήστης ανοίγει due/overdue charge.
2. Επιλέγει `Record payment`.
3. Καταγράφει ποσό, ημερομηνία, τρόπο και reference.
4. Το σύστημα υπολογίζει paid/partially paid κατάσταση.
5. Όταν εξοφληθεί recurring charge, προγραμματίζεται η επόμενη charge με
   idempotent τρόπο.

### Renewal

- Εμφανίζονται upcoming renewals για 30/60/90 ημέρες.
- Manual-renew υπηρεσία απαιτεί απόφαση χρήστη.
- Auto-renew υπηρεσία συνεχίζει το billing schedule μέχρι cancellation/end date.
- Cancellation δεν διαγράφει παλιές charges ή payments.

### Μετατροπή Won deal

Ένα Won deal μπορεί προαιρετικά να δημιουργήσει customer service μέσω ρητής
ενέργειας. Δεν δημιουργείται αυτόματα πριν ο χρήστης επιβεβαιώσει service,
billing cycle και ημερομηνία έναρξης.

## Αρχικές οθόνες

1. **Services catalog:** reusable υπηρεσίες του organization.
2. **Customer services:** όλες οι ενεργές/paused/expired συμφωνίες.
3. **Payments due:** upcoming, due, overdue και paid charges.
4. **Company / Services & billing:** υπηρεσίες, επόμενες χρεώσεις και ιστορικό
   πληρωμών του συγκεκριμένου πελάτη.

Create και edit flows ανοίγουν σε MUI drawers. Tables, date pickers, menus και
feedback χρησιμοποιούν τις καθιερωμένες libraries και το υπάρχον design system.

## Business metrics

- Monthly recurring revenue ανά currency.
- Amount due και overdue ανά currency.
- Renewals στις επόμενες 30/60/90 ημέρες.
- Active services ανά company.
- Churned/cancelled services χωρίς να παρουσιάζονται ως accounting metrics.

Δεν αθροίζουμε διαφορετικά currencies και δεν περιλαμβάνουμε VAT στο revenue.

## Tenant και permissions

- Όλα τα records ανήκουν ρητά σε organization.
- Company, deal, owner και catalog item πρέπει να ανήκουν στο ίδιο organization.
- Reads/writes περνούν από membership capabilities.
- Organization IDs του payload δεν θεωρούνται αξιόπιστα.
- Payments δεν διαγράφονται σιωπηρά· διορθώνονται με auditable reversal ή
  ακύρωση σε επόμενη έκδοση.

## Acceptance criteria για την πρώτη έκδοση

- Δημιουργία και επεξεργασία catalog service.
- Ανάθεση recurring ή one-off service σε company.
- Αυτόματος υπολογισμός net/VAT/gross.
- Δημιουργία της επόμενης charge χωρίς duplicates.
- Προβολή upcoming/due/overdue charges.
- Καταγραφή full και partial payment.
- Αυτόματη ενημέρωση charge status από τα payments.
- Pause/cancel service χωρίς απώλεια ιστορικού.
- Tenant isolation και role enforcement.
- Company-level και organization-level views.
- Business documentation και πλήρης test coverage των οικονομικών invariants.

## Εκτός πρώτης έκδοσης

- Έκδοση invoice/receipt/credit note.
- myDATA ή σύνδεση λογιστικής πλατφόρμας.
- Payment gateway και αυτόματη τραπεζική συμφωνία.
- Dunning emails και αυτόματη είσπραξη κάρτας.
- Revenue recognition και double-entry accounting.
- Usage-based pricing, tiered pricing και complex proration.
- Multi-currency conversion.

## Ανοιχτές αποφάσεις πριν την υλοποίηση

1. Επιτρέπουμε custom billing interval στην πρώτη έκδοση ή μόνο προκαθορισμένα;
2. Μπορεί payment να καλύπτει περισσότερες από μία charges ή μόνο μία;
3. Χρειάζεται grace period πριν μία charge γίνει overdue;
4. Ποιος ρόλος μπορεί να καταγράφει ή να διορθώνει payments;
5. Θέλουμε reference πεδία ειδικά για domain/hosting ή ένα γενικό operational
   reference στην πρώτη έκδοση;

Οι παραπάνω αποφάσεις πρέπει να κλείσουν πριν δημιουργηθούν models και migrations.
