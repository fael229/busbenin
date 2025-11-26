# 🕒 Système de disponibilité avec timeout de 30 minutes

## 📋 Vue d'ensemble

Le système de disponibilité des véhicules utilise maintenant une logique sophistiquée pour bloquer les réservations :

### Règles de blocage

#### ✅ **Réservations APPROVED (Payées)**

- **Statut** : `statut_paiement = 'approved'`
- **Durée de blocage** : **ILLIMITÉE** ♾️
- **Justification** : Le paiement est confirmé, la réservation est définitive

#### ⏱️ **Réservations PENDING (En attente de paiement)**

- **Statut** : `statut_paiement = 'pending'`
- **Durée de blocage** : **30 MINUTES** ⏰
- **Justification** : Donne du temps pour payer, mais libère le véhicule si non payé

## 🔄 Scénarios d'utilisation

### Scénario 1 : Paiement rapide (< 30 min)

```
13:00 → Client A crée une réservation (pending)
       → Véhicule BLOQUÉ pour 30 minutes
13:10 → Client B essaye de réserver
       → ❌ "Véhicule indisponible"
13:15 → Client A paie avec succès
       → Statut: approved
       → Véhicule BLOQUÉ indéfiniment pour Client A
```

### Scénario 2 : Abandon de paiement (> 30 min)

```
13:00 → Client A crée une réservation (pending)
       → Véhicule BLOQUÉ pour 30 minutes
13:10 → Client B essaye de réserver
       → ❌ "Véhicule indisponible"
13:35 → Timeout atteint (30 min dépassées)
       → Véhicule redevient DISPONIBLE
13:36 → Client B essaye de réserver
       → ✅ "Véhicule disponible"
       → Client B peut réserver
```

### Scénario 3 : Paiement après timeout

```
13:00 → Client A crée une réservation (pending)
13:35 → Véhicule redevient disponible
13:36 → Client B réserve et paie (approved)
13:40 → Client A revient pour payer
       → ⚠️ Doit créer une NOUVELLE réservation
       → Mais véhicule déjà pris par Client B
```

## ⚙️ Fonctions SQL

### 1. `check_vehicule_disponibilite(vehicule_id, date_debut, date_fin)`

Vérifie si un véhicule est disponible pour des dates données.

**Critères de blocage** :

```sql
WHERE (
  -- Toujours bloqué si payé
  (statut_paiement = 'approved')
  OR
  -- Bloqué si pending et créé il y a < 30 min
  (statut_paiement = 'pending' AND created_at > NOW() - INTERVAL '30 minutes')
)
AND (date_debut <= p_date_fin AND date_fin >= p_date_debut)
```

**Retourne** :

- `TRUE` si disponible
- `FALSE` si bloqué

### 2. `get_dates_reservees(vehicule_id)`

Retourne les périodes réservées pour un véhicule.

**N'affiche que** :

- Réservations `approved` (toutes)
- Réservations `pending` créées il y a < 30 min

### 3. Vue `vehicules_avec_disponibilite`

Liste tous les véhicules avec un indicateur `disponible_maintenant`.

## 📊 État des réservations au fil du temps

```
Minute 0  : ✅ Réservation créée (pending)    → BLOQUÉ
Minute 10 : ✅ Toujours pending                → BLOQUÉ
Minute 20 : ✅ Toujours pending                → BLOQUÉ
Minute 30 : ⏰ TIMEOUT atteint                 → BLOQUÉ
Minute 31 : ❌ Plus de blocage                 → DISPONIBLE
```

## 🎯 Avantages de ce système

### ✅ Avantages

1. **Sécurité** : Évite les doubles réservations pendant le paiement
2. **Flexibilité** : Libère automatiquement les véhicules non payés
3. **Optimisation** : Maximise la disponibilité des véhicules
4. **Équité** : 30 minutes est suffisant pour un paiement normal

### ⚠️ Points d'attention

1. **Paiement lent** : Si le client met > 30 min, il perd sa réservation
2. **Interruption réseau** : Un problème réseau peut faire dépasser les 30 min
3. **Expérience utilisateur** : Le client doit être averti du timeout

## 💡 Recommandations

### Pour les utilisateurs

- ⏰ Payez dans les 30 minutes
- 📱 Restez dans l'application pendant le paiement
- 🔄 Si timeout, créez une nouvelle réservation

### Pour l'implémentation

1. **Afficher un compte à rebours** : "Temps restant: 28:45"
2. **Envoyer des notifications** : "Plus que 5 minutes pour payer !"
3. **Prolonger l'option** : Bouton "Prolonger de 10 min" (optionnel)

## 🔧 Configuration

### Modifier le timeout

Pour changer de 30 minutes à une autre durée, modifiez dans toutes les fonctions :

```sql
-- Changer de 30 à 60 minutes par exemple
AND created_at > NOW() - INTERVAL '60 minutes'
```

### Timeouts recommandés

- ⚡ **15 minutes** : Pour location très demandée
- ✅ **30 minutes** : Équilibre recommandé (actuel)
- **60 minutes** : Pour plus de flexibilité
- ⏳ **120 minutes** : Pour paiement complexe

## 📄 Mise à jour

Pour appliquer ce système :

```sql
-- Dans Supabase SQL Editor, exécutez :
-- web/sql/10_vehicle_availability.sql
```

Cela met à jour :

- ✅ La fonction `check_vehicule_disponibilite()`
- ✅ La vue `vehicules_avec_disponibilite`
- ✅ La fonction `get_dates_reservees()`

## 🧪 Tests

### Test 1 : Réservation récente (< 30 min)

```sql
-- Créer une réservation pending il y a 10 minutes
-- Vérifier disponibilité
-- → Devrait retourner FALSE (bloqué)
```

### Test 2 : Réservation ancienne (> 30 min)

```sql
-- Créer une réservation pending il y a 35 minutes
-- Vérifier disponibilité
-- → Devrait retourner TRUE (disponible)
```

### Test 3 : Réservation payée

```sql
-- Créer une réservation approved il y a 2 heures
-- Vérifier disponibilité
-- → Devrait retourner FALSE (bloqué)
```

---

**Version** : 2.0 - Système avec timeout 30 minutes
**Date** : 2025-11-20
