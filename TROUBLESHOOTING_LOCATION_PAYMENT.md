# 🔧 Guide de résolution : "Aucune transaction trouvée"

## Problème
- ❌ Sur mobile : Message "Aucune transaction trouvée" lors de la vérification du paiement
- ❌ Sur web : Le bouton "Vérifier" n'apparaît pas pour certaines réservations de location

## Cause
La table `reservations_location` dans Supabase ne contient pas toutes les colonnes nécessaires :
- `nom_locataire`
- `telephone_locataire`
- `email_locataire`
- `statut_paiement`
- `transaction_id` (normalement présente mais à vérifier)

## Solution

### Étape 1 : Exécuter le script SQL dans Supabase

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier : `web/sql/08_fix_reservations_location.sql`
5. Exécutez le script (bouton "Run")

Le script va :
- ✅ Vérifier si les colonnes existent
- ✅ Ajouter les colonnes manquantes
- ✅ Mettre à jour les données existantes
- ✅ Afficher la structure finale de la table

### Étape 2 : Vérifier les logs

Après l'exécution, vous devriez voir des messages comme :
```
Colonne nom_locataire ajoutée
Colonne telephone_locataire ajoutée
Colonne email_locataire ajoutée
Colonne statut_paiement ajoutée
```

### Étape 3 : Tester l'application

#### Test Mobile :
1. Créez une nouvelle réservation de location
2. Effectuez le paiement via FedaPay
3. Revenez à "Mes réservations"
4. Cliquez sur "Vérifier"
5. ✅ Le statut devrait se mettre à jour correctement

#### Test Web :
1. Allez sur la page "Mes réservations"
2. ✅ Le bouton "Vérifier" devrait apparaître pour les réservations en attente
3. Cliquez sur "Vérifier"
4. ✅ Le statut devrait se mettre à jour

## Debug supplémentaire

Si le problème persiste, vérifiez les logs de la console :

### Mobile (Metro Bundler) :
```
🔍 DEBUG - Vérification paiement: { type, reservationId, transactionId, ... }
📡 Appel checkTransactionStatus avec: [ID]
📊 Résultat: { success, status, ... }
💾 Mise à jour table: reservations_location
```

### Web (Console du navigateur) :
```javascript
// Devrait afficher l'ID de transaction
console.log('Transaction ID:', transactionId)
```

## Vérification manuelle dans Supabase

Pour vérifier manuellement la structure de la table :

```sql
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'reservations_location'
ORDER BY ordinal_position;
```

Vous devriez voir toutes les colonnes listées, y compris :
- `nom_locataire` (text)
- `telephone_locataire` (text)
- `email_locataire` (text)
- `statut_paiement` (text, default: 'pending')
- `transaction_id` (text)

## Vérifier une réservation spécifique

```sql
SELECT 
    id,
    montant_total,
    statut,
    statut_paiement,
    transaction_id,
    nom_locataire,
    telephone_locataire
FROM reservations_location
ORDER BY created_at DESC
LIMIT 5;
```

Si `transaction_id` est NULL, cela signifie que :
1. La réservation a été créée avant la mise en place du système de paiement
2. OU le processus de paiement n'a pas abouti jusqu'au bout

## Notes importantes

- Les anciennes réservations créées AVANT l'exécution du script SQL n'auront pas de `transaction_id`
- Seules les NOUVELLES réservations créées APRÈS l'exécution du script fonctionneront correctement
- Le bouton "Vérifier" n'apparaît que si `statut_paiement === 'pending'` ET `transaction_id` existe
