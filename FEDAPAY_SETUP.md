# Configuration FedaPay pour les paiements Mobile Money

Ce guide explique comment configurer FedaPay pour permettre les réservations et paiements par Mobile Money au Bénin.

**Note**: Cette implémentation utilise directement l'API REST de FedaPay via `fetch` pour la compatibilité React Native, au lieu du SDK Node.js.

**Authentification**: FedaPay utilise **Bearer Authentication** avec la clé secrète :
```
Authorization: Bearer sk_sandbox_...
```

## 1. Créer un compte FedaPay

1. Allez sur [https://fedapay.com/](https://fedapay.com/)
2. Créez un compte
3. Vérifiez votre email
4. Accédez à votre tableau de bord

## 2. Obtenir vos clés API

### Mode Sandbox (Tests)

1. Dans le tableau de bord FedaPay, allez dans **Paramètres > API**
2. Copiez votre **Clé publique sandbox** (`pk_sandbox_...`)
3. Copiez votre **Clé secrète sandbox** (`sk_sandbox_...`)

### Mode Production (Réel)

1. Complétez la vérification de votre compte (KYC)
2. Dans **Paramètres > API**, passez en mode Production
3. Copiez votre **Clé publique production** (`pk_live_...`)
4. Copiez votre **Clé secrète production** (`sk_live_...`)

## 3. Configurer l'application

1. Copiez le fichier `.env.example` en `.env`:
   ```bash
   cp .env.example .env
   ```

2. Ouvrez `.env` et remplacez les valeurs:
   ```env
   # Pour les tests (Sandbox)
   EXPO_PUBLIC_FEDAPAY_PUBLIC_KEY=pk_sandbox_VOTRE_CLE_ICI
   EXPO_PUBLIC_FEDAPAY_SECRET_KEY=sk_sandbox_VOTRE_CLE_ICI
   EXPO_PUBLIC_FEDAPAY_ENV=sandbox
   
   # Pour la production (décommentez et utilisez ces lignes)
   # EXPO_PUBLIC_FEDAPAY_PUBLIC_KEY=pk_live_VOTRE_CLE_ICI
   # EXPO_PUBLIC_FEDAPAY_SECRET_KEY=sk_live_VOTRE_CLE_ICI
   # EXPO_PUBLIC_FEDAPAY_ENV=production
   ```

3. Redémarrez votre serveur Expo:
   ```bash
   npx expo start --clear
   ```

## 4. Créer la table des réservations dans Supabase

1. Accédez à votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez le script SQL dans `supabase_migrations/reservations.sql`

## 5. Tester les paiements

### Mode Sandbox

En mode sandbox, vous pouvez tester avec des numéros de téléphone factices:

- **Paiement réussi**: `+22997000001`
- **Paiement échoué**: `+22997000002`
- **Paiement en attente**: `+22997000003`

### Mode Production

En mode production, les vrais numéros Mobile Money sont utilisés:
- **MTN Mobile Money** - Opérateur principal au Bénin
- **Moov Money** - Deuxième opérateur
- **Celtiis Cash** - Troisième opérateur

L'application permet aux utilisateurs de sélectionner leur opérateur lors de la réservation.

## 6. Flux de paiement

1. **L'utilisateur sélectionne un trajet** et clique sur "Réserver"
2. **Formulaire de réservation**:
   - Nombre de places
   - Horaire de départ
   - **Opérateur Mobile Money** (MTN, Moov, ou Celtiis)
   - Informations du passager (nom, téléphone, email)
3. **Création de la réservation** dans Supabase
4. **Création de la transaction FedaPay** avec l'opérateur sélectionné
5. **Page de paiement intégrée** (WebView dans l'application)
   - L'utilisateur reste dans l'application
   - Interface FedaPay affichée directement
   - Pas de redirection externe
6. **L'utilisateur paie** avec son compte Mobile Money
   - Composition du code USSD *xxx#
   - Confirmation par PIN
7. **Vérification du paiement**:
   - Détection automatique de la fin du paiement
   - Bouton "Vérifier le paiement" disponible
   - Mise à jour du statut dans Supabase
8. **Confirmation** affichée dans l'application
   - Écran de succès avec icône verte
   - Ou écran d'échec avec options de réessai
   - Redirection vers "Mes réservations"

## 7. Webhooks FedaPay (Optionnel mais recommandé)

Pour recevoir automatiquement les notifications de paiement:

1. Dans FedaPay, allez dans **Paramètres > Webhooks**
2. Ajoutez une URL webhook: `https://votre-domaine.com/api/fedapay/webhook`
3. Créez un endpoint API dans votre backend pour traiter les webhooks
4. Mettez à jour automatiquement le statut des réservations

## 8. Sécurité

⚠️ **IMPORTANT**:

- **Ne commitez JAMAIS** vos clés secrètes dans Git
- Le fichier `.env` est dans `.gitignore`
- Utilisez les variables d'environnement pour stocker les clés
- En production, stockez les clés dans un service sécurisé (Expo Secrets, etc.)

## 9. Support

- Documentation FedaPay: [https://docs.fedapay.com/](https://docs.fedapay.com/)
- Support FedaPay: support@fedapay.com
- Téléphone FedaPay: +229 XX XX XX XX

## 10. Frais de transaction

FedaPay prélève des frais sur chaque transaction. Consultez leur site pour les tarifs actuels.

Vous pouvez:
- Inclure les frais dans le prix du billet
- Ajouter les frais au montant total
- Les absorber vous-même

## 11. Dépannage

### Erreur "Transaction failed"
- Vérifiez que vos clés API sont correctes
- Vérifiez que vous êtes en mode sandbox/production approprié
- Vérifiez le solde du compte Mobile Money test

### Erreur "Invalid phone number"
- Le numéro doit être au format international: `+229XXXXXXXX`
- Assurez-vous qu'il contient exactement 8 chiffres après +229

### Paiement bloqué en "pending"
- En sandbox, cela peut être normal
- En production, contactez le support FedaPay
- L'utilisateur peut vérifier le statut dans "Mes réservations"

## 12. Environnements

### Développement (Local)
```env
EXPO_PUBLIC_FEDAPAY_ENV=sandbox
```

### Staging/Test
```env
EXPO_PUBLIC_FEDAPAY_ENV=sandbox
```

### Production
```env
EXPO_PUBLIC_FEDAPAY_ENV=production
```
