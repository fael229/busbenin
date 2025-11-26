# Correction de l'erreur "public.wallets does not exist"

D'après votre capture d'écran, le trigger coupable est `on_reservation_location_paid`. Il faut le supprimer.

## Instructions

1. Allez dans le **Dashboard Supabase**.
2. Ouvrez l'**Éditeur SQL**.
3. Copiez et exécutez le script suivant :

```sql
-- 1. Supprimer le trigger visible sur votre capture d'écran
DROP TRIGGER IF EXISTS on_reservation_location_paid ON public.reservations_location;

-- 2. Supprimer la fonction associée qui cause l'erreur
DROP FUNCTION IF EXISTS public.credit_wallet_on_reservation_paid();

-- 3. Sécurité : supprimer d'autres variantes possibles
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON public.reservations_location;
DROP FUNCTION IF EXISTS public.update_wallet_balance();
```

4. Une fois exécuté, le paiement fonctionnera immédiatement.
