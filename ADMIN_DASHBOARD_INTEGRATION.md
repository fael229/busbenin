# Intégration des Dashboards Admin et Propriétaire (Location)

Ce document décrit comment accéder et utiliser les nouveaux tableaux de bord pour la gestion de la location de véhicules sur les plateformes Web et Mobile.

## 1. Pour les Propriétaires de Véhicules

Les propriétaires peuvent gérer leurs véhicules, voir leurs réservations et suivre leurs revenus.

### **Accès Web**

1. Connectez-vous à votre compte.
2. Allez sur votre **Profil** (cliquez sur votre avatar ou "Mon Compte").
3. Dans la section **"Mes Services"**, cliquez sur la carte **"Mes Véhicules en Location"**.
4. **Fonctionnalités** :
   - Ajouter un nouveau véhicule.
   - Modifier ou supprimer un véhicule existant.
   - Voir la liste des réservations reçues.
   - Filtrer par statut (Payé, En attente, Annulé).
   - Exporter les données en CSV.

### **Accès Mobile**

1. Ouvrez l'application et connectez-vous.
2. Allez dans l'onglet **Paramètres** (icône d'engrenage).
3. Dans la section **"Services"**, appuyez sur **"Mes Véhicules"**.
4. **Fonctionnalités** :
   - Vue d'ensemble avec statistiques (Total véhicules, Réservations, Revenus).
   - Onglet "Véhicules" : Liste, Ajout, Modification, Suppression.
   - Onglet "Réservations" : Liste des réservations avec statut de paiement.

---

## 2. Pour les Administrateurs Généraux

Les administrateurs ont une vue globale sur tout le système de location.

### **Accès Web**

1. Connectez-vous avec un compte ayant le rôle `admin`.
2. Allez sur le **Dashboard Admin** (`/admin/dashboard`).
3. Dans la section **"Quick Actions"**, cliquez sur la carte **"Location de Véhicules"**.
4. **Fonctionnalités** :
   - **Vue d'ensemble** : Statistiques globales (Revenu total, Taux d'occupation, etc.).
   - **Véhicules** : Liste de tous les véhicules de tous les propriétaires. Possibilité de supprimer.
   - **Réservations** : Liste de toutes les réservations.
   - **Propriétaires** : Liste des propriétaires actifs avec leurs statistiques.

### **Accès Mobile**

1. Connectez-vous avec un compte `admin`.
2. Allez dans l'onglet **Admin** (si disponible dans votre barre de navigation ou via un menu dédié).
3. Sur le tableau de bord admin, appuyez sur le bouton **"Gestion Location"**.
4. **Fonctionnalités** :
   - Liste de tous les véhicules avec le nom du propriétaire.
   - Liste de toutes les réservations avec le statut de paiement.
   - Possibilité de supprimer des véhicules inappropriés.

---

## 3. Structure des Fichiers

### **Web**

- `web/src/pages/MesVehiculesLocation.jsx` : Dashboard Propriétaire.
- `web/src/pages/AdminLocation.jsx` : Dashboard Admin.
- `web/src/pages/Profile.jsx` : Point d'entrée pour les propriétaires.
- `web/src/pages/admin/Dashboard.jsx` : Point d'entrée pour les admins.

### **Mobile**

- `mobile/src/app/(tabs)/mes-vehicules.jsx` : Dashboard Propriétaire.
- `mobile/src/app/(tabs)/admin/manage-locations.jsx` : Dashboard Admin.
- `mobile/src/app/(tabs)/parametres.jsx` : Point d'entrée pour les propriétaires.
- `mobile/src/app/(tabs)/admin/dashboard.jsx` : Point d'entrée pour les admins.
