# 🔄 Améliorations du système de vérification de paiement

## Problème résolu

**"Le paiement est approved mais la vérification retourne toujours pending"**

## Cause

FedaPay peut mettre plusieurs secondes (voire minutes) pour mettre à jour le statut d'une transaction de `pending` à `approved`. Une seule vérification immédiate ne suffit donc pas.

## Solution implémentée

### 1. **Polling automatique intelligent** ⚡

Le système vérifie maintenant automatiquement le statut toutes les 3 secondes :

```javascript
verifierPaiement((autoRetry = true), (attempt = 1), (maxAttempts = 10));
```

**Paramètres :**

- `autoRetry`: Active le mode polling automatique
- `attempt`: Numéro de la tentative actuelle
- `maxAttempts`: Nombre maximum de tentatives (10 par défaut = 30 secondes)

**Comportement :**

- ⏰ Attend 3 secondes entre chaque tentative
- 🔄 Réessaye automatiquement jusqu'à 10 fois
- ✅ S'arrête dès que le statut devient `approved`
- ❌ S'arrête si le statut devient `declined` ou `canceled`
- ⚠️ Affiche un message si toujours `pending` après 10 tentatives

### 2. **Démarrage automatique du polling** 🚀

Dès que l'utilisateur revient sur l'app après le paiement :

```javascript
// Démarre automatiquement 5 secondes après l'ouverture du lien FedaPay
setTimeout(() => {
  verifierPaiement(true, 1, 10); // Polling activé
}, 5000);
```

**Timeline :**

- T+0s : Ouverture du lien FedaPay
- T+5s : Première vérification automatique
- T+8s : 2e tentative si toujours pending
- T+11s : 3e tentative si toujours pending
- T+14s : 4e tentative si toujours pending
- ...
- T+35s : 10e et dernière tentative automatique

### 3. **Logs détaillés** 📊

Tous les événements sont loggés pour faciliter le débogage :

```
🔍 Tentative 1/10 - Vérification transaction: xxx
📊 Résultat FedaPay: { success: true, status: 'pending', ... }
⏳ Paiement toujours en attente
⏰ Nouvelle tentative dans 3 secondes...
🔍 Tentative 2/10 - Vérification transaction: xxx
📊 Résultat FedaPay: { success: true, status: 'approved', ... }
💾 Mise à jour table: reservations_location avec statut: approved
✅ Paiement approuvé!
```

### 4. **Meilleure UX** 💫

**Messages utilisateur améliorés :**

- ✅ "Validez l'opération sur votre téléphone"
- 🔄 "Le statut sera vérifié automatiquement toutes les 3 secondes"
- Indicateur de chargement pendant la vérification
- Message clair si le paiement prend trop de temps

## Flux complet

### Mobile (Location de véhicule)

```
1. Utilisateur remplit le formulaire de réservation
2. Clique sur "Confirmer et Payer"
   ↓
3. Réservation créée avec statut_paiement = 'pending'
   ↓
4. Transaction FedaPay créée
   ↓
5. transaction_id sauvegardé dans la réservation
   ↓
6. Redirection vers /paiement/[transactionId] avec tableName='reservations_location'
   ↓
7. Ouverture automatique du lien FedaPay
   ↓
8. Utilisateur valide le paiement sur son téléphone
   ↓
9. Polling automatique démarre 5 secondes après
   ↓
10. Vérification toutes les 3 secondes (max 10 fois)
   ↓
11. Dès que statut = 'approved':
    - Mise à jour de la réservation (statut_paiement + statut)
    - Redirection automatique vers "Mes réservations"
```

### Web (Location de véhicule)

Le même système de polling fonctionne mais avec des confirmations explicites :

```
1. Utilisateur remplit le formulaire
2. Clique sur "Payer"
   ↓
3. Réservation créée
   ↓
4. FedaPay ouvert dans une nouvelle fenêtre
   ↓
5. Dialogue : "Avez-vous payé ?"
   ↓
6. Si OUI : Vérification du statut
   ↓
7. Mise à jour et redirection
```

## Vérification manuelle

Si le polling automatique échoue, l'utilisateur peut toujours :

**Mobile :**

- Aller dans "Mes réservations"
- Cliquer sur le bouton "Vérifier"
- Le système fera UNE vérification immédiate

**Web :**

- Même chose : bouton "Vérifier" dans la liste des réservations

## Configuration

### Ajuster le timing du polling

Dans `paiement/[transactionId].jsx` :

```javascript
// Délai avant le premier check
setTimeout(() => {
  verifierPaiement(true, 1, 10);
}, 5000); // 5 secondes

// Délai entre chaque tentative
setTimeout(() => {
  verifierPaiement(true, attempt + 1, maxAttempts);
}, 3000); // 3 secondes

// Nombre max de tentatives
const maxAttempts = 10; // 10 tentatives = 30 secondes total
```

### Augmenter le nombre de tentatives

Si FedaPay est très lent dans votre environnement :

```javascript
// Au lieu de 10 tentatives (30s)
verifierPaiement(true, 1, 20); // 20 tentatives = 60 secondes
```

## Tests

### Test du polling automatique

1. Créez une réservation de location
2. Effectuez le paiement Mobile Money
3. Revenez immédiatement à l'app
4. Observez la console Metro :
   ```
   🚀 Démarrage du polling automatique dans 5 secondes...
   ▶️ Début de la vérification automatique du paiement
   🔍 Tentative 1/10 - Vérification transaction: xxx
   ```
5. Le statut devrait se mettre à jour automatiquement

### Test de la vérification manuelle

1. Si le polling échoue
2. Allez dans "Mes réservations"
3. Cliquez sur "Vérifier"
4. Vérifiez les logs pour voir le problème

## Notes importantes

- ⚠️ Le polling ne fonctionne QUE si `transaction_id` existe
- ⚠️ Les colonnes `statut_paiement` et `transaction_id` DOIVENT exister dans `reservations_location`
- ⚠️ Exécutez le script SQL `08_fix_reservations_location.sql` si ce n'est pas déjà fait
- ✅ Le système fonctionne pour TOUS les types de réservations (trajets ET locations)

## Dépannage

### Le polling ne démarre pas

- Vérifiez que `transactionId` est bien passé en paramètre
- Vérifiez les logs : cherchez "🚀 Démarrage du polling"

### Le statut reste "pending" après 10 tentatives

- FedaPay est peut-être très lent
- Augmentez `maxAttempts` à 20 ou 30
- Ou attendez quelques minutes et vérifiez manuellement

### Erreur "transaction_id is NULL"

- Exécutez le script SQL `08_fix_reservations_location.sql`
- Créez une NOUVELLE réservation (les anciennes n'ont pas de transaction_id)
