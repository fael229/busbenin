# 🏢 Guide d'utilisation pour les Compagnies

Guide complet pour les compagnies de transport utilisant l'application BusBenin.

## 📋 Qu'est-ce qu'un compte Compagnie ?

Un compte **Compagnie** permet à une compagnie de transport de :
- ✅ **Gérer ses propres trajets** (créer, modifier, supprimer)
- ✅ **Voir ses réservations uniquement** (pas celles des autres compagnies)
- ✅ **Vérifier les paiements** de ses clients
- ✅ **Annuler des réservations** si nécessaire

## 🔐 Différences avec les autres comptes

| Fonctionnalité | Utilisateur Normal | Compagnie | Admin |
|----------------|-------------------|-----------|-------|
| Faire des réservations | ✅ | ✅ | ✅ |
| Voir ses réservations | ✅ | ✅ | ✅ |
| Gérer ses trajets | ❌ | ✅ | ✅ |
| Voir réservations de sa compagnie | ❌ | ✅ | ✅ |
| Voir toutes les réservations | ❌ | ❌ | ✅ |
| Gérer toutes les compagnies | ❌ | ❌ | ✅ |
| Gérer les utilisateurs | ❌ | ❌ | ✅ |

## 🚀 Création d'un compte Compagnie

### Étape 1 : Créer le compte utilisateur

**Option A - Via l'application mobile** :
1. Ouvrir l'application
2. Aller sur **"S'inscrire"**
3. Entrer l'email et le mot de passe de la compagnie
4. Créer le compte

**Option B - Via Supabase Dashboard** :
1. Aller dans **Authentication** → **Users**
2. Cliquer sur **"Invite User"**
3. Entrer l'email de la compagnie
4. L'utilisateur recevra un email pour définir son mot de passe

### Étape 2 : Associer le compte à une compagnie

**Dans Supabase SQL Editor**, exécuter :

```sql
-- Associer un utilisateur à une compagnie
UPDATE public.profiles
SET compagnie_id = (
  SELECT id FROM compagnies 
  WHERE nom = 'Nom de la Compagnie' 
  LIMIT 1
)
WHERE email = 'email@compagnie.com';
```

**Remplacez** :
- `'Nom de la Compagnie'` par le nom exact de votre compagnie
- `'email@compagnie.com'` par l'email du compte créé

### Étape 3 : Vérifier l'association

```sql
-- Vérifier que l'association est correcte
SELECT 
  p.email,
  p.admin,
  c.nom as compagnie_nom,
  c.id as compagnie_id
FROM profiles p
LEFT JOIN compagnies c ON c.id = p.compagnie_id
WHERE p.email = 'email@compagnie.com';
```

Résultat attendu :
- `admin` = `false`
- `compagnie_nom` = Nom de votre compagnie
- `compagnie_id` = UUID de la compagnie

## 📱 Utilisation de l'application

### Interface pour les Compagnies

Lorsqu'une compagnie se connecte, elle voit :

#### **Onglet "Gestion"** (au lieu de "Admin")
- 🏢 Icône de building (au lieu du shield)
- Titre : "Gestion Compagnie"
- Description : "Gérez vos trajets et réservations"

#### **Deux options disponibles** :

**1. Gérer mes trajets**
- Voir automatiquement les trajets de la compagnie
- Ajouter de nouveaux trajets
- Supprimer des trajets existants
- Pas d'accès aux trajets des autres compagnies

**2. Mes réservations**
- Voir uniquement les réservations des trajets de la compagnie
- Rechercher par nom, téléphone, trajet
- Filtrer par statut (En attente, Payées, Échouées)
- Vérifier les paiements FedaPay
- Annuler des réservations si nécessaire

## 🎯 Gestion des trajets

### Ajouter un trajet

1. Aller dans **"Gestion"** → **"Gérer mes trajets"**
2. Votre compagnie s'affiche automatiquement
3. Remplir le formulaire :
   - **Départ** : Ville de départ (ex: Cotonou)
   - **Arrivée** : Ville d'arrivée (ex: Parakou)
   - **Prix** : Prix en FCFA (ex: 5000)
4. Cliquer sur **"Ajouter"**

### Supprimer un trajet

1. Trouver le trajet dans la liste
2. Cliquer sur l'icône **poubelle** 🗑️
3. Confirmer la suppression

### ⚠️ Important
- Les trajets supprimés ne peuvent pas être récupérés
- Les réservations liées au trajet seront également affectées

## 📊 Gestion des réservations

### Voir les réservations

1. Aller dans **"Gestion"** → **"Mes réservations"**
2. Voir automatiquement toutes les réservations de vos trajets

### Rechercher une réservation

Utilisez la barre de recherche pour trouver par :
- Nom du passager
- Numéro de téléphone
- Trajet (départ ou arrivée)

### Filtrer par statut

- **Toutes** : Toutes vos réservations
- **En attente** : Paiements en cours (⏳ jaune)
- **Payées** : Paiements confirmés (✅ vert)
- **Échouées** : Paiements échoués/annulés (❌ rouge)

### Vérifier un paiement

Pour une réservation **"En attente"** :
1. Cliquer sur **"Vérifier"** (bouton bleu)
2. Le système interroge FedaPay
3. Le statut se met à jour automatiquement

**Utilité** :
- Le client dit avoir payé mais le statut n'est pas à jour
- Vérifier manuellement l'état du paiement

### Annuler une réservation

Pour une réservation **"En attente"** :
1. Cliquer sur **"Annuler"** (bouton rouge)
2. Confirmer l'annulation
3. Le statut devient "Annulé"

**Cas d'usage** :
- Erreur de réservation
- Demande d'annulation du client
- Places non disponibles finalement

## 🔒 Restrictions et sécurité

### Ce que vous POUVEZ faire :
- ✅ Voir vos propres trajets
- ✅ Ajouter/supprimer vos trajets
- ✅ Voir les réservations de vos trajets
- ✅ Vérifier les paiements de vos réservations
- ✅ Annuler vos réservations

### Ce que vous NE POUVEZ PAS faire :
- ❌ Voir les trajets des autres compagnies
- ❌ Voir les réservations des autres compagnies
- ❌ Modifier les utilisateurs
- ❌ Créer d'autres compagnies
- ❌ Accéder aux données d'autres compagnies

### Sécurité

- 🔐 **RLS (Row Level Security)** activé
- 🔐 Filtrage automatique par `compagnie_id`
- 🔐 Impossible d'accéder aux données des autres compagnies
- 🔐 Politiques Supabase strictes

## 📈 Statistiques et rapports

### Informations disponibles

Pour chaque réservation, vous voyez :
- 👤 **Passager** : Nom, téléphone, email
- 🚍 **Trajet** : Départ → Arrivée
- 🎫 **Places** : Nombre de places réservées
- 💰 **Montant** : Montant total en FCFA
- 🕐 **Horaire** : Horaire de départ choisi
- 📅 **Date** : Date de la réservation
- 💳 **Statut paiement** : En attente / Payé / Échoué

### Voir vos statistiques (futures fonctionnalités)

En cours de développement :
- Nombre total de réservations
- Montant total des ventes
- Taux de conversion (réservations vs paiements)
- Graphiques de tendances
- Export CSV/Excel

## 💡 Conseils d'utilisation

### Pour une gestion efficace

1. **Vérifiez régulièrement** les réservations "En attente"
2. **Contactez les clients** pour les paiements en attente depuis longtemps
3. **Vérifiez les paiements** avant chaque départ
4. **Gardez vos trajets à jour** avec les bons prix

### En cas de problème

**Client dit avoir payé mais statut "En attente"** :
- Cliquez sur "Vérifier" pour interroger FedaPay
- Attendez quelques minutes et réessayez
- Si le problème persiste, contactez le support

**Réservation par erreur** :
- Utilisez le bouton "Annuler"
- Ne supprimez jamais un trajet avec des réservations actives

**Trajet avec mauvais prix** :
- Actuellement : Supprimer et recréer le trajet
- Bientôt : Fonction de modification directe

## 📞 Support

Pour toute question ou problème :
- Email support BusBenin
- Vérifiez la documentation
- Consultez les logs de l'application

## ✅ Checklist de démarrage

Avant de commencer à utiliser l'application :

- [ ] Compte créé avec l'email de la compagnie
- [ ] Compte associé à votre compagnie dans Supabase
- [ ] Connexion testée dans l'application
- [ ] Onglet "Gestion" visible (pas "Admin")
- [ ] Au moins un trajet créé
- [ ] Test de réservation effectué
- [ ] Vérification d'un paiement testée

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2025  
**Destiné aux** : Compagnies de transport partenaires de BusBenin
