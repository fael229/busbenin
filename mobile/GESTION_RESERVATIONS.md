# Gestion des Réservations

Ce guide explique comment les admins et les compagnies peuvent gérer les réservations dans l'application BusBenin.

## 🎯 Accès au système

### Pour les Admins
1. Se connecter avec un compte admin
2. Aller dans l'onglet **"Admin"**
3. Cliquer sur **"Gérer les réservations"**
4. **Vue complète** : Toutes les réservations de toutes les compagnies

### Pour les Compagnies
1. Se connecter avec un compte compagnie
2. Aller dans l'onglet **"Admin"**
3. Cliquer sur **"Gérer les réservations"**
4. **Vue filtrée** : Uniquement les réservations de leur compagnie

## 📊 Interface de gestion

### 1. Barre de recherche
Rechercher par :
- Nom du passager
- Numéro de téléphone
- Email
- Trajet (départ ou arrivée)
- Nom de la compagnie (admin uniquement)

### 2. Filtres de statut
- **Toutes** : Affiche toutes les réservations
- **En attente** : Réservations avec paiement en attente
- **Payées** : Réservations avec paiement confirmé
- **Échouées** : Réservations avec paiement échoué/refusé/annulé

### 3. Carte de réservation

Chaque réservation affiche :
- **Trajet** : Départ → Arrivée
- **Date et heure** de la réservation
- **Statut du paiement** (badge coloré)
- **Informations passager** :
  - Nom complet
  - Téléphone
  - Compagnie (pour les admins)
- **Détails** :
  - Nombre de places
  - Montant total
  - Horaire de départ

## 🎨 Codes couleur des statuts

### ✅ Payé (Complete/Approved)
- Badge vert
- Paiement confirmé par FedaPay
- Aucune action nécessaire

### ⏳ En attente (Pending)
- Badge jaune
- Paiement en cours ou non finalisé
- Actions disponibles : Vérifier, Annuler

### ❌ Échoué (Failed/Declined/Canceled)
- Badge rouge
- Paiement refusé ou annulé
- Information uniquement

## 🔧 Actions disponibles

### Pour les réservations "En attente"

#### 1. Vérifier le paiement
- **Bouton** : "Vérifier" (bleu)
- **Action** : 
  - Interroge l'API FedaPay
  - Récupère le statut réel de la transaction
  - Met à jour le statut dans la base de données
- **Utilité** : 
  - Si le client dit avoir payé mais le statut n'est pas à jour
  - Vérification manuelle de l'état du paiement

#### 2. Annuler la réservation
- **Bouton** : "Annuler" (rouge)
- **Action** :
  - Marque la réservation comme "canceled"
  - Demande confirmation avant d'annuler
- **Utilité** :
  - Erreur de réservation
  - Demande d'annulation du client
  - Places non disponibles finalement

### Pour les réservations "Payées"
- Affiche "Paiement confirmé" (vert)
- Aucune action supplémentaire nécessaire
- La réservation est validée

## 📱 Utilisation pratique

### Scénario 1 : Client dit avoir payé
```
1. Rechercher la réservation (nom ou téléphone)
2. Vérifier le statut actuel
3. Si "En attente" :
   - Cliquer sur "Vérifier"
   - Attendre la vérification FedaPay
   - Le statut sera mis à jour automatiquement
```

### Scénario 2 : Annulation nécessaire
```
1. Trouver la réservation
2. Si "En attente" :
   - Cliquer sur "Annuler"
   - Confirmer l'annulation
   - Le statut passe à "Canceled"
```

### Scénario 3 : Vérification rapide
```
1. Utiliser les filtres de statut
2. "Payées" → Voir toutes les réservations confirmées
3. "En attente" → Voir celles nécessitant attention
4. "Échouées" → Voir les problèmes de paiement
```

## 🔄 Rafraîchissement

### Automatique
- Chaque fois que vous revenez sur la page
- Après une vérification de paiement
- Après une annulation

### Manuel
- **Pull-to-refresh** : Tirez vers le bas pour actualiser
- Recharge toutes les données depuis la base

## 📊 Statistiques (futures fonctionnalités)

En développement :
- Nombre total de réservations
- Montant total des ventes
- Taux de conversion (réservations vs paiements)
- Graphiques de tendances
- Export CSV/Excel des réservations

## 🔐 Sécurité et permissions

### Admins
✅ Voir toutes les réservations
✅ Toutes compagnies
✅ Vérifier tous les paiements
✅ Annuler toutes réservations

### Compagnies
✅ Voir leurs réservations uniquement
✅ Vérifier leurs paiements
✅ Annuler leurs réservations
❌ Pas d'accès aux autres compagnies

### Utilisateurs normaux
❌ Pas d'accès à cette page
✅ Accès à "Mes réservations" pour voir leurs propres réservations

## 🚀 Workflow complet

```
RÉSERVATION CLIENT
    ↓
[Création dans la base]
    ↓
[Transaction FedaPay]
    ↓
[Statut: pending]
    ↓
    ├─→ CLIENT PAIE
    │      ↓
    │   [Auto-détection ou vérification manuelle]
    │      ↓
    │   [Statut: complete]
    │      ↓
    │   ✅ RÉSERVATION CONFIRMÉE
    │
    ├─→ PAIEMENT ÉCHOUE
    │      ↓
    │   [Statut: failed]
    │      ↓
    │   ❌ À RÉESSAYER
    │
    └─→ ANNULATION MANUELLE
           ↓
        [Statut: canceled]
           ↓
        🚫 ANNULÉE
```

## 💡 Conseils d'utilisation

### Pour une gestion efficace
1. **Vérifier régulièrement** les réservations "En attente"
2. **Utiliser la recherche** pour retrouver rapidement une réservation
3. **Filtrer par statut** pour traiter les priorités
4. **Rafraîchir** avant une vérification importante

### En cas de problème
1. **Client non trouvé** : Vérifier l'orthographe du nom
2. **Statut incorrect** : Cliquer sur "Vérifier"
3. **Paiement bloqué** : Contacter FedaPay support
4. **Doute sur statut** : Toujours vérifier plutôt qu'annuler

## 📞 Support

Pour tout problème technique :
- Contacter l'équipe BusBenin
- Vérifier les logs FedaPay
- Consulter la documentation FedaPay

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2025
