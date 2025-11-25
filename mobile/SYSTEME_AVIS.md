# 🌟 Système de notation et d'avis

## Vue d'ensemble

Système complet permettant aux utilisateurs de noter les trajets (1-5 étoiles) et de laisser des commentaires. Les admins et compagnies peuvent répondre aux avis pour améliorer la relation client.

---

## 📋 Table des matières

1. [Architecture](#architecture)
2. [Fonctionnalités](#fonctionnalités)
3. [Installation](#installation)
4. [Utilisation](#utilisation)
5. [Interface utilisateur](#interface-utilisateur)
6. [Sécurité](#sécurité)
7. [Tests](#tests)

---

## 🏗️ Architecture

### Base de données

```sql
Table: avis
├── id (uuid, PK)
├── user_id (uuid, FK → auth.users)
├── trajet_id (uuid, FK → trajets)
├── note (integer, 1-5)
├── commentaire (text)
├── reponse (text) ⭐ NOUVEAU
├── reponse_par (uuid, FK → auth.users) ⭐ NOUVEAU
├── reponse_at (timestamp) ⭐ NOUVEAU
└── created_at (timestamp)

Contraintes:
- Un utilisateur = 1 avis par trajet
- Note entre 1 et 5 obligatoire
```

### Déclencheur automatique

```sql
TRIGGER: update_trajet_note
Déclenche: Après INSERT/UPDATE/DELETE sur avis
Action:
  1. Calcule la moyenne des notes
  2. Compte le nombre d'avis
  3. Met à jour trajets.note et trajets.nb_avis
```

---

## ✨ Fonctionnalités

### Pour les utilisateurs

#### 1. Laisser un avis
- ✅ Notation de 1 à 5 étoiles
- ✅ Commentaire obligatoire (500 caractères max)
- ✅ Un seul avis par trajet par utilisateur
- ✅ Interface intuitive avec étoiles interactives
- ✅ Labels descriptifs (Très mauvais → Excellent)
- ✅ Vérification si avis déjà déposé

#### 2. Voir les avis
- ✅ Liste complète des avis d'un trajet
- ✅ Note moyenne et nombre total d'avis
- ✅ Informations du voyageur
- ✅ Date de publication
- ✅ Réponses de l'admin/compagnie
- ✅ Pull-to-refresh

### Pour les admins et compagnies

#### 1. Répondre aux avis
- ✅ **Admins** : Peuvent répondre à tous les avis
- ✅ **Compagnies** : Peuvent répondre aux avis de leurs trajets uniquement
- ✅ Modal dédiée pour écrire la réponse
- ✅ Modification de réponse possible
- ✅ Affichage du nom de la personne ayant répondu

#### 2. Permissions
```
Admin:
  ✅ Voir tous les avis
  ✅ Répondre à tous les avis
  ✅ Modifier/supprimer leurs réponses

Compagnie:
  ✅ Voir tous les avis
  ✅ Répondre uniquement aux avis de leurs trajets
  ✅ Modifier/supprimer leurs réponses
```

---

## 🛠️ Installation

### Étape 1: Exécuter la migration SQL

```sql
-- Dans Supabase SQL Editor
\i supabase_migrations/add_reponses_avis.sql
```

Ou copier-coller le contenu dans l'éditeur SQL de Supabase.

### Étape 2: Vérifier les colonnes

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'avis';
```

Vous devriez voir :
- `reponse` (text)
- `reponse_par` (uuid)
- `reponse_at` (timestamp with time zone)

### Étape 3: Vérifier le trigger

```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_trajet_note';
```

### Étape 4: Tester les RLS

```sql
-- Se connecter en tant qu'utilisateur
SELECT * FROM avis; -- ✅ Doit fonctionner

-- Tenter d'insérer un 2ème avis pour le même trajet
-- ❌ Doit échouer avec erreur RLS
```

---

## 📱 Utilisation

### 1. Laisser un avis (Utilisateur)

**Navigation** :
```
Trajet détail → Bouton "Laisser un avis"
ou
Directement: /avis/[trajetId]
```

**Étapes** :
1. Sélectionner de 1 à 5 étoiles
2. Écrire un commentaire (obligatoire)
3. Cliquer sur "Publier mon avis"

**Validation** :
- ✅ Note sélectionnée
- ✅ Commentaire non vide
- ✅ Pas d'avis déjà déposé pour ce trajet

### 2. Voir les avis

**Navigation** :
```
Trajet détail → Cliquer sur "X avis"
ou
Directement: /avis/liste/[trajetId]
```

**Affichage** :
- Note moyenne en haut
- Nombre total d'avis
- Liste des avis triés par date (récents en premier)
- Pull-to-refresh pour recharger

### 3. Répondre à un avis (Admin/Compagnie)

**Prérequis** :
- Être connecté en tant qu'admin OU
- Être connecté en tant que compagnie propriétaire du trajet

**Étapes** :
1. Aller sur la liste des avis du trajet
2. Cliquer sur "Répondre" ou "Modifier la réponse"
3. Écrire la réponse dans le modal
4. Cliquer sur "Publier"

**Bonnes pratiques** :
- ✅ Répondre de manière professionnelle
- ✅ Remercier pour les avis positifs
- ✅ Proposer des solutions pour les avis négatifs
- ✅ Ne pas être défensif
- ✅ Montrer l'engagement à améliorer le service

---

## 🎨 Interface utilisateur

### Page: Laisser un avis (`/avis/[trajetId]`)

**Composants** :
- Header avec retour
- Carte trajet (départ → arrivée, compagnie)
- **Étoiles interactives** (48px, jaune #FCD34D)
- Labels dynamiques selon la note
- Champ texte multiline (120px min)
- Compteur de caractères
- Bouton "Publier" (désactivé si incomplet)
- Message informatif

**États** :
```javascript
- note: 0-5 (0 = non sélectionné)
- commentaire: string
- loading: boolean
- avisDeja: boolean
- trajet: object
```

### Page: Liste des avis (`/avis/liste/[trajetId]`)

**Composants** :
- Header avec retour
- Carte trajet avec note moyenne
- **Cartes avis** :
  - Avatar/nom utilisateur
  - Étoiles remplies selon note
  - Date
  - Commentaire
  - Réponse (si existe)
  - Bouton "Répondre" (si autorisé)
- Pull-to-refresh
- État vide avec illustration

**Modal réponse** :
- Avis original (résumé)
- Champ texte pour réponse
- Boutons Annuler / Publier

### Intégration page trajet

**Modifications** :
```jsx
// Avis cliquable
<TouchableOpacity onPress={() => router.push(`/avis/liste/${trajetId}`)}>
  <Star /> {note} ({nb_avis} avis)
</TouchableOpacity>

// Bouton laisser avis
<TouchableOpacity onPress={() => router.push(`/avis/${trajetId}`)}>
  <Edit3 /> Laisser un avis
</TouchableOpacity>
```

---

## 🔒 Sécurité

### Row Level Security (RLS)

#### Lecture (SELECT)
```sql
Policy: "Avis visibles par tous"
Condition: authenticated
Résultat: Tout utilisateur connecté peut voir tous les avis
```

#### Création (INSERT)
```sql
Policy: "Utilisateurs peuvent créer avis"
Conditions:
  1. auth.uid() = user_id (créer pour soi uniquement)
  2. Pas d'avis existant pour ce trajet
Résultat: 1 avis par utilisateur par trajet
```

#### Modification (UPDATE)

**Pour les utilisateurs** :
```sql
Policy: "Utilisateurs peuvent modifier leurs avis"
Condition: auth.uid() = user_id
Résultat: Modifier son propre avis uniquement
```

**Pour les admins/compagnies** :
```sql
Policy: "Admins et compagnies peuvent répondre"
Conditions:
  1. Admin OU compagnie du trajet
  2. reponse_par = auth.uid() (traçabilité)
Résultat: Répondre aux avis autorisés
```

#### Suppression (DELETE)
```sql
Policy: "Utilisateurs peuvent supprimer leurs avis"
Condition: auth.uid() = user_id
Résultat: Supprimer son propre avis uniquement
```

### Fonction sécurisée

```sql
Function: repondre_avis(p_avis_id, p_reponse)
Security: DEFINER (exécuté avec privilèges de la fonction)
Vérifications:
  1. Récupération du rôle utilisateur
  2. Vérification admin OU compagnie du trajet
  3. Mise à jour atomique
  4. Traçabilité (reponse_par, reponse_at)
```

---

## 🧪 Tests

### Test 1: Créer un avis

```javascript
// Scénario: Utilisateur laisse un avis
1. Se connecter en tant qu'utilisateur
2. Aller sur un trajet
3. Cliquer "Laisser un avis"
4. Sélectionner 5 étoiles
5. Écrire "Excellent service !"
6. Cliquer "Publier"

Résultat attendu:
✅ Message "Merci ! Votre avis a été publié"
✅ Redirection automatique
✅ Note du trajet mise à jour
✅ Nombre d'avis incrémenté
```

### Test 2: Avis en double (échec attendu)

```javascript
// Scénario: Même utilisateur tente 2 avis
1. Créer un premier avis (réussi)
2. Retourner sur la page "Laisser un avis"

Résultat attendu:
✅ Message "Vous avez déjà laissé un avis"
✅ Bouton "Retour"
✅ Impossible de soumettre
```

### Test 3: Réponse admin

```sql
-- Scénario: Admin répond à un avis
1. Se connecter en tant qu'admin
2. Aller sur liste avis d'un trajet
3. Cliquer "Répondre" sur un avis
4. Écrire "Merci pour votre retour !"
5. Publier

Résultat attendu:
✅ Réponse enregistrée
✅ reponse_par = admin_id
✅ reponse_at = NOW()
✅ Affichage immédiat dans la liste
```

### Test 4: Réponse compagnie (trajet non propriétaire - échec)

```javascript
// Scénario: Compagnie tente de répondre à un autre trajet
1. Se connecter en tant que Compagnie A
2. Aller sur avis d'un trajet de Compagnie B
3. Bouton "Répondre" NE DOIT PAS apparaître

Résultat attendu:
❌ Aucun bouton "Répondre"
✅ RLS empêche l'action
```

### Test 5: Calcul note moyenne

```sql
-- Scénario: Vérifier le trigger
SELECT id, note, nb_avis FROM trajets WHERE id = 'trajet-test-id';
-- Avant: note=0, nb_avis=0

-- Ajouter 3 avis (5★, 4★, 3★)
INSERT INTO avis (user_id, trajet_id, note, commentaire) VALUES
  ('user1', 'trajet-test-id', 5, 'Excellent'),
  ('user2', 'trajet-test-id', 4, 'Bon'),
  ('user3', 'trajet-test-id', 3, 'Moyen');

SELECT id, note, nb_avis FROM trajets WHERE id = 'trajet-test-id';
-- Après: note=4.0, nb_avis=3

Résultat attendu:
✅ note = (5+4+3)/3 = 4.0
✅ nb_avis = 3
✅ Mise à jour automatique via trigger
```

---

## 📊 Statistiques et analytics

### Requêtes utiles

**Top trajets par note** :
```sql
SELECT 
  t.depart,
  t.arrivee,
  t.note,
  t.nb_avis,
  c.nom as compagnie
FROM trajets t
JOIN compagnies c ON t.compagnie_id = c.id
WHERE t.nb_avis >= 5  -- Au moins 5 avis
ORDER BY t.note DESC, t.nb_avis DESC
LIMIT 10;
```

**Avis récents sans réponse** :
```sql
SELECT 
  a.id,
  a.note,
  a.commentaire,
  a.created_at,
  t.depart || ' → ' || t.arrivee as trajet,
  c.nom as compagnie
FROM avis a
JOIN trajets t ON a.trajet_id = t.id
JOIN compagnies c ON t.compagnie_id = c.id
WHERE a.reponse IS NULL
ORDER BY a.created_at DESC;
```

**Taux de réponse par compagnie** :
```sql
SELECT 
  c.nom,
  COUNT(a.id) as total_avis,
  COUNT(a.reponse) as avis_repondus,
  ROUND(COUNT(a.reponse)::numeric / NULLIF(COUNT(a.id), 0) * 100, 1) as taux_reponse
FROM compagnies c
JOIN trajets t ON c.id = t.compagnie_id
LEFT JOIN avis a ON t.id = a.trajet_id
GROUP BY c.id, c.nom
ORDER BY taux_reponse DESC;
```

**Distribution des notes** :
```sql
SELECT 
  note,
  COUNT(*) as nombre,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM avis) * 100, 1) as pourcentage
FROM avis
GROUP BY note
ORDER BY note DESC;
```

---

## 🎯 Cas d'usage

### Cas 1: Voyageur satisfait

```
1. Jean prend le bus Cotonou → Porto-Novo
2. Voyage confortable, arrivée à l'heure
3. Jean laisse 5★ avec commentaire positif
4. La compagnie remercie Jean pour son avis
5. Note moyenne de la compagnie augmente
6. Plus de clients choisissent cette compagnie
```

### Cas 2: Problème signalé

```
1. Marie prend un bus en retard de 2h
2. Marie laisse 2★ avec explication du problème
3. L'admin voit l'avis et contacte la compagnie
4. La compagnie répond à Marie avec excuses + solution
5. Marie apprécie la réactivité
6. La compagnie améliore sa ponctualité
```

### Cas 3: Avis modéré

```
1. Un utilisateur laisse un avis inapproprié
2. L'admin peut le supprimer via Supabase
3. L'utilisateur est notifié
4. Le système reste propre et professionnel
```

---

## 🚀 Évolutions futures

### Court terme
- [ ] Modération automatique (mots interdits)
- [ ] Photos dans les avis
- [ ] Avis "utile" (like)
- [ ] Trier par note/date

### Moyen terme
- [ ] Avis vérifiés (après réservation confirmée)
- [ ] Badges compagnies ("Répond toujours", "Note 4.5+")
- [ ] Notifications push (nouvelle réponse)
- [ ] Rapport abus

### Long terme
- [ ] Intelligence artificielle pour détecter faux avis
- [ ] Analyse de sentiment
- [ ] Dashboard analytics complet
- [ ] Réponses suggérées par IA

---

## 📖 Résumé technique

### Fichiers créés
```
supabase_migrations/
  └── add_reponses_avis.sql

src/app/(tabs)/
  └── avis/
      ├── _layout.jsx
      ├── [trajetId].jsx (laisser avis)
      └── liste/
          └── [trajetId].jsx (voir avis + répondre)

Documentation:
  └── SYSTEME_AVIS.md (ce fichier)
```

### Fichiers modifiés
```
src/app/(tabs)/
  ├── _layout.jsx (ajout route "avis")
  └── trajet/[id].jsx (boutons avis)
```

### Fonctions principales
- `loadTrajet()` - Charger infos trajet
- `checkAvisExistant()` - Vérifier si avis déjà déposé
- `soumettreAvis()` - Créer un nouvel avis
- `loadAvis()` - Charger tous les avis
- `ouvrirModalReponse()` - Ouvrir modal réponse
- `envoyerReponse()` - RPC repondre_avis
- `canRepondre()` - Vérifier permissions
- `renderStars()` - Afficher étoiles

---

## ✅ Checklist d'installation

- [ ] Migration SQL exécutée
- [ ] Trigger vérifié
- [ ] RLS activé
- [ ] Fichiers créés dans le bon dossier
- [ ] Routes ajoutées dans _layout
- [ ] Boutons ajoutés dans page trajet
- [ ] Test: Créer un avis
- [ ] Test: Voir les avis
- [ ] Test: Répondre (admin)
- [ ] Test: Répondre (compagnie)
- [ ] Test: Avis en double (doit échouer)
- [ ] Test: Calcul note moyenne
- [ ] Documentation lue

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2025  
**Auteur** : Système BusBenin  
**Statut** : ✅ Production Ready
