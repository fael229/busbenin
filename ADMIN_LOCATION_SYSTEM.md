# 🔧 Système d'Administration - Location de Véhicules

## 📋 Vue d'ensemble

Deux niveaux d'administration ont été créés pour le système de location de véhicules :

1. **Propriétaires de véhicules** - Gestion personnelle
2. **Administrateur général** - Vue et contrôle complets

---

## 👤 Tableau de bord PROPRIÉTAIRE

### 📍 Accès

**Web** : `/mes-vehicules-location`
**Mobile** : `/mes-vehicules`

### 🎯 Fonctionnalités

#### 1. **Statistiques en temps réel**

- ✅ Nombre total de véhicules en location
- ✅ Nombre total de réservations
- ✅ Revenu total (réservations payées)
- ✅ Réservations en attente

#### 2. **Gestion des véhicules**

- ✅ Liste complète de vos véhicules
- ✅ Voir les détails
- ✅ Modifier un véhicule
- ✅ Supprimer un véhicule
- ✅ Ajouter un nouveau véhicule

#### 3. **Suivi des réservations**

- ✅ Liste de toutes les réservations pour vos véhicules
- ✅ Informations client (nom, téléphone, email)
- ✅ Détails véhicule (marque, modèle)
- ✅ Période de location (date début - date fin)
- ✅ Montant de la réservation
- ✅ Statut de paiement (Payé / En attente / Refusé)

#### 4. **Filtres avancés**

- ✅ Filtre par statut de paiement
- ✅ Filtre par date de début
- ✅ Filtre par date de fin

#### 5. **Export de données**

- ✅ Export CSV des réservations
- ✅ Contient: Date, Véhicule, Client, Téléphone, Période, Montant, Statut

### 📊 Interface

```
┌─────────────────────────────────────────────────────────┐
│  [🚗 15]  [📅 45]  [💰 2.5M FCFA]  [⏳ 3]              │
│  Véhicules  Réservations  Revenu  En Attente            │
├─────────────────────────────────────────────────────────┤
│  [Mes Véhicules (15)] [Réservations (45)]              │
├─────────────────────────────────────────────────────────┤
│  Onglet actif: Véhicules                                │
│  ┌──────────────────────────────────────────────┐      │
│  │ [+] Ajouter un véhicule                       │      │
│  │                                                │      │
│  │ [🚗 Toyota Corolla 2020]  15,000 FCFA/jour   │      │
│  │     [👁 Voir] [✏️ Modifier] [🗑 Supprimer]      │      │
│  │                                                │      │
│  │ [🚗 Honda Civic 2021]  18,000 FCFA/jour      │      │
│  │     [👁 Voir] [✏️ Modifier] [🗑 Supprimer]      │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## 👨‍💼 Tableau de bord ADMINISTRATEUR

### 📍 Accès

**Web SEULEMENT** : `/admin/location`

**Requis** : Rôle `admin` dans la table `profiles`

### 🎯 Fonctionnalités

#### 1. **Statistiques globales avancées**

- ✅ Total véhicules (tous propriétaires)
- ✅ Total réservations
- ✅ Revenu total du système
- ✅ Nombre de propriétaires
- ✅ Taux d'occupation (%)
- ✅ Réservations aujourd'hui

#### 2. **Vue d'ensemble**

- ✅ Répartition par statut de paiement
- ✅ Top 5 véhicules les plus chers
- ✅ Graphiques et métriques

#### 3. **Gestion des véhicules (tous)**

- ✅ Liste complète de TOUS les véhicules
- ✅ Informations propriétaire pour chaque véhicule
- ✅ Téléphone et email du propriétaire
- ✅ Voir détails
- ✅ Supprimer n'importe quel véhicule
- ✅ Export CSV complet

#### 4. **Gestion des réservations (toutes)**

- ✅ Liste de TOUTES les réservations du système
- ✅ Informations véhicule + propriétaire
- ✅ Informations client
- ✅ Période et montant
- ✅ Statut de paiement
- ✅ Filtres: statut, date début, date fin
- ✅ Export CSV complet

#### 5. **Gestion des propriétaires**

- ✅ Liste de tous les propriétaires
- ✅ Nom, email, téléphone
- ✅ Nombre de véhicules par propriétaire
- ✅ Nombre de réservations par propriétaire
- ✅ Revenu total par propriétaire

### 📊 Interface

```
┌────────────────────────────────────────────────────────────────────┐
│ [🚗 50] [📅 245] [💰 12.5M] [👥 15] [📈 73%] [📆 12]            │
│ Véhicules Réserv  Revenu  Proprios Taux  Aujourd'hui               │
├────────────────────────────────────────────────────────────────────┤
│ [Vue d'ensemble] [Véhicules (50)] [Réservations (245)] [Proprios (15)] │
├────────────────────────────────────────────────────────────────────┤
│ Onglet: Réservations                                                │
│ ┌─ Filtres ─────────────────────────────────────────────────────┐ │
│ │ [Tous ▾] [Date début] [Date fin] [📥 Exporter]               │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ │ Date     │ Véhicule      │ Proprio   │ Client  │ Montant │ Statut │
│ ├──────────┼───────────────┼───────────┼─────────┼─────────┼────────┤
│ │ 20/11/25 │ Toyota Cor... │ Jean D.   │ Marie K.│ 45K     │ ✅ Payé │
│ │ 19/11/25 │ Honda Civic   │ Paul M.   │ Luc S.  │ 54K     │ ⏳ Att. │
│ └────────────────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Contrôle d'accès

### Propriétaire (User)

- ✅ Peut voir SEULEMENT ses véhicules
- ✅ Peut voir SEULEMENT les réservations de ses véhicules
- ✅ Peut modifier/supprimer SEULEMENT ses véhicules
- ❌ Ne peut PAS voir les autres propriétaires
- ❌ Ne peut PAS accéder aux statistiques globales

### Administrateur (Admin)

- ✅ Peut voir TOUS les véhicules
- ✅ Peut voir TOUTES les réservations
- ✅ Peut supprimer N'IMPORTE QUEL véhicule
- ✅ Peut voir TOUS les propriétaires
- ✅ Accès aux statistiques globales
- ✅ Export de toutes les données

---

## 📁 Fichiers créés

### Web

1. **`web/src/pages/MesVehiculesLocation.jsx`**

   - Tableau de bord propriétaire
   - Gestion véhicules personnels
   - Suivi réservations

2. **`web/src/pages/AdminLocation.jsx`**

   - Tableau de bord administrateur
   - Vue système complète
   - Contrôle total

3. **Routes dans `web/src/App.jsx`**
   - `/mes-vehicules-location` → MesVehiculesLocation (Protected)
   - `/admin/location` → AdminLocation (AdminRoute)

### Mobile

1. **`mobile/src/app/(tabs)/mes-vehicules.jsx`**
   - Version mobile du tableau de bord propriétaire
   - Statistiques et gestion simplifiée
   - Pull-to-refresh

---

## 🚀 Utilisation

### Pour les propriétaires

#### Web

1. Connectez-vous à votre compte
2. Accédez à `/mes-vehicules-location`
3. Gérez vos véhicules et consultez vos réservations

#### Mobile

1. Connectez-vous à l'application mobile
2. Allez sur l'onglet "Mes Véhicules"
3. Consultez vos stats et gérez vos véhicules

### Pour l'administrateur

#### Web (uniquement)

1. Connectez-vous avec un compte admin (`role = 'admin'`)
2. Accédez à `/admin/location`
3. Vue complète du système

**Note** : Si l'utilisateur n'est pas admin, il sera redirigé vers la page d'accueil.

---

## 📊 Export CSV

### Format propriétaire

```csv
Date,Véhicule,Client,Téléphone,Période,Montant,Statut
20/11/2025,Toyota Corolla,Marie Kone,+22997123456,25/11-28/11,45000 FCFA,Payé
```

### Format administrateur (véhicules)

```csv
Marque,Modèle,Année,Prix/Jour,Propriétaire,Email,Téléphone
Toyota,Corolla,2020,15000 FCFA,Jean Dupont,jean@email.com,+229...
```

### Format administrateur (réservations)

```csv
Date,Véhicule,Propriétaire,Client,Téléphone,Période,Montant,Statut
20/11/25,Toyota Corolla,Jean D.,Marie K.,+229...,25/11-28/11,45K,Payé
```

---

## 🛠️ Configuration requise

### Base de données

```sql
-- Table profiles doit avoir un champ 'role'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Créer un admin
UPDATE profiles SET role = 'admin' WHERE email = 'admin@votredomaine.com';
```

### Politiques RLS

Les politiques existantes devraient suffire, mais assurez-vous que :

- Les utilisateurs peuvent lire leurs propres véhicules
- Les admins peuvent tout voir

---

## 🎨 Fonctionnalités UI

### Indicateurs visuels

- 🟢 **Vert** : Paiement approuvé
- 🟡 **Jaune** : Paiement en attente
- 🔴 **Rouge** : Paiement refusé

### Boutons d'action

- 👁️ **Voir** : Consulter détails
- ✏️ **Modifier** : Éditer le véhicule
- 🗑️ **Supprimer** : Retirer le véhicule
- ➕ **Ajouter** : Nouveau véhicule
- 📥 **Exporter** : Télécharger CSV

---

## ⚡ Prochaines améliorations possibles

### Propriétaire

1. 📊 Graphiques de performance
2. 📧 Notifications par email
3. 💬 Messagerie avec clients
4. ⭐ Système d'évaluation
5. 📅 Calendrier de disponibilité visuel
6. 📈 Prévisions de revenus

### Admin

1. 📊 Dashboard analytique avancé
2. 📧 Envoi d'emails en masse
3. 🔒 Suspendre/Activer des comptes
4. 💰 Gestion des commissions
5. 📝 Rapports automatiques mensuels
6. 🔍 Recherche avancée multi-critères

---

**Version** : 1.0
**Date** : 2025-11-20
**Status** : ✅ Opérationnel
