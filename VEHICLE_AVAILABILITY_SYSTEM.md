# 🚗 Système de gestion de disponibilité des véhicules de location

## Vue d'ensemble

Ce système permet de gérer la disponibilité des véhicules de location en vérifiant les chevauchements de dates avec les réservations existantes.

## Fichiers créés

### 1. **SQL - Fonctions de disponibilité**

📄 `web/sql/10_vehicle_availability.sql`

Contient 3 fonctions SQL :

#### a) `check_vehicule_disponibilite(vehicule_id, date_debut, date_fin)`

- Vérifie si un véhicule est disponible pour une période donnée
- Retourne `TRUE` si disponible, `FALSE` si déjà réservé
- Prend en compte les réservations confirmées et en attente

#### b) `vehicules_avec_disponibilite` (Vue)

- Liste tous les véhicules avec un indicateur `disponible_maintenant`
- Utile pour afficher uniquement les véhicules disponibles

#### c) `get_dates_reservees(vehicule_id)`

- Retourne toutes les périodes réservées pour un véhicule
- Utile pour afficher un calendrier avec les dates bloquées

### 2. **JavaScript - Utilitaires client**

📄 `web/src/utils/vehicleAvailability.js`  
📄 `mobile/src/utils/vehicleAvailability.js`

Contient 6 fonctions :

#### a) `checkVehiculeDisponibilite(vehiculeId, dateDebut, dateFin)`

```javascript
const result = await checkVehiculeDisponibilite(
  "vehicule-id",
  "2025-11-25",
  "2025-12-03"
);
// { available: true/false, conflictingReservations: [...], message: '...' }
```

#### b) `getDatesReservees(vehiculeId)`

```javascript
const dates = await getDatesReservees("vehicule-id");
// [{ date_debut: '2025-11-25', date_fin: '2025-11-28', ... }]
```

#### c) `filterVehiculesDisponibles(vehicules, dateDebut, dateFin)`

```javascript
const disponibles = await filterVehiculesDisponibles(
  tousLesVehicules,
  "2025-11-25",
  "2025-12-03"
);
```

#### d) `periodesSeRecoupent(debut1, fin1, debut2, fin2)`

```javascript
const overlap = periodesSeRecoupent(
  "2025-11-25",
  "2025-11-28",
  "2025-11-27",
  "2025-11-30"
);
// true
```

#### e) `getDatesBloquees(vehiculeId)`

```javascript
const blocked = await getDatesBloquees("vehicule-id");
// ['2025-11-25', '2025-11-26', '2025-11-27', '2025-11-28']
```

## Comment utiliser

### Étape 1 : Exécuter le script SQL

1. Ouvrez **Supabase SQL Editor**
2. Exécutez le contenu de `web/sql/10_vehicle_availability.sql`
3. Vérifiez que les fonctions sont créées

### Étape 2 : Intégrer dans les pages

#### **Sur la page de liste des véhicules** (`Location.jsx` - web / `location/index.jsx` - mobile)

```javascript
import { filterVehiculesDisponibles } from "../utils/vehicleAvailability";

// Ajouter un filtre de dates
const [dateFiltre, setDateFiltre] = useState({
  debut: "",
  fin: "",
});

// Filtrer les véhicules
useEffect(() => {
  if (dateFiltre.debut && dateFiltre.fin) {
    filterVehiculesDisponibles(
      vehicules,
      dateFiltre.debut,
      dateFiltre.fin
    ).then(setVehiculesFiltres);
  }
}, [vehicules, dateFiltre]);
```

#### **Sur la page de réservation** (`LocationReservation.jsx`)

```javascript
import { checkVehiculeDisponibilite } from "../utils/vehicleAvailability";

// Vérifier avant de soumettre
const handleSubmit = async (e) => {
  e.preventDefault();

  // 1. Vérifier la disponibilité
  const { available, conflictingReservations } =
    await checkVehiculeDisponibilite(
      vehiculeId,
      dates.date_debut,
      dates.date_fin
    );

  if (!available) {
    alert(
      `❌ Véhicule indisponible\n\nCe véhicule est déjà réservé pour ${conflictingReservations.length} période(s) qui chevauche(nt) vos dates.`
    );
    return;
  }

  // 2. Continuer avec la réservation...
};
```

#### **Pour afficher les dates réservées**

```javascript
import {
  getDatesReservees,
  getDatesBloquees,
} from "../utils/vehicleAvailability";

useEffect(() => {
  getDatesReservees(vehiculeId).then(setPeriodesReservees);
  getDatesBloquees(vehiculeId).then(setDatesBloquees);
}, [vehiculeId]);

// Afficher
{
  periodesReservees.map((periode) => (
    <div key={periode.id}>
      Du {periode.date_debut} au {periode.date_fin}- Statut: {periode.statut_paiement}
    </div>
  ));
}
```

## Logique de chevauchement

Deux périodes se chevauchent si :

```
période1.debut <= période2.fin
ET
période1.fin >= période2.debut
```

Exemples :

- ✅ 25-28 nov + 27-30 nov = **Chevauchement** (27-28 nov)
- ✅ 25-30 nov + 26-27 nov = **Chevauchement** (26-27 nov)
- ❌ 25-28 nov + 29-30 nov = **Pas de chevauchement**
- ❌ 25-28 nov + 20-24 nov = **Pas de chevauchement**

## États considérés

Le système considère une réservation comme "bloquante" si :

- `statut` IN ('confirmee', 'en_attente')
- `statut_paiement` IN ('approved', 'pending')

Cela signifie :

- ✅ **Bloquante** : Réservation confirmée avec paiement approuvé
- ✅ **Bloquante** : Réservation en attente avec paiement en cours
- ❌ **Non bloquante** : Réservation annulée
- ❌ **Non bloquante** : Réservation avec paiement refusé

## Mise en œuvre complète

### Version WEB :

**À faire dans `LocationReservation.jsx` :**

1. Importer les fonctions
2. Vérifier la disponibilité avant de créer la réservation
3. Afficher les périodes déjà réservées (optionnel)
4. Bloquer le bouton de réservation si indisponible

**À faire dans `Location.jsx` :**

1. Ajouter un filtre par dates
2. Filtrer les véhicules disponibles
3. Afficher un badge "Indisponible" sur les véhicules réservés

### Version MOBILE :

**Même chose que web, mais dans :**

- `mobile/src/app/(tabs)/location/reserver/[id].jsx`
- `mobile/src/app/(tabs)/location/index.jsx`

## Exemple de flux complet

1. **Utilisateur A** : Réserve un véhicule du 25 au 28 novembre

   - Statut : `en_attente`, Paiement : `pending`
   - Le véhicule est **bloqué** du 25 au 28 novembre

2. **Utilisateur B** : Essaye de réserver le même véhicule du 27 au 30 novembre
   - ❌ Système détecte le chevauchement (27-28 nov)
   - ❌ Message : "V

éhicule indisponible"

3. **Utilisateur A** : Paie et confirme

   - Statut : `confirmee`, Paiement : `approved`
   - Le véhicule reste **bloqué** du 25 au 28 novembre

4. **Utilisateur B** : Réserve du 29 novembre au 2 décembre
   - ✅ Aucun chevauchement
   - ✅ Réservation acceptée

## Tests

### Test 1 : Vérifier une réservation simple

```sql
SELECT check_vehicule_disponibilite(
  'VOTRE_VEHICULE_ID'::UUID,
  '2025-11-25'::DATE,
  '2025-11-28'::DATE
);
```

### Test 2 : Voir toutes les réservations d'un véhicule

```sql
SELECT * FROM get_dates_reservees('VOTRE_VEHICULE_ID'::UUID);
```

### Test 3 : Lister les véhicules disponibles maintenant

```sql
SELECT * FROM vehicules_avec_disponibilite WHERE disponible_maintenant = TRUE;
```

## Notes importantes

- ⚠️ Les dates sont inclusives (date_debut ET date_fin sont comprises)
- ⚠️ Une réservation du 25 au 28 bloque 4 jours (25, 26, 27, 28)
- ⚠️ Le système compte "en_attente" comme bloqué (pour éviter les doubles réservations)
- ✅ Fonctionne pour les réservations qui spannent plusieurs mois
- ✅ Les réservations passées (date_fin < CURRENT_DATE) ne bloquent plus

## Fichiers à modifier

Pour implémenter complètement le système :

### WEB :

- ✅ `web/sql/10_vehicle_availability.sql` (créé)
- ✅ `web/src/utils/vehicleAvailability.js` (créé)
- ⏳ `web/src/pages/LocationReservation.jsx` (à modifier)
- ⏳ `web/src/pages/Location.jsx` (à modifier)

### MOBILE :

- ✅ `mobile/src/utils/vehicleAvailability.js` (créé)
- ⏳ `mobile/src/app/(tabs)/location/reserver/[id].jsx` (à modifier)
- ⏳ `mobile/src/app/(tabs)/location/index.jsx` (à modifier)

---

**Statut actuel** : Fonctions SQL et JavaScript créées ✅  
**Action suivante** : Intégrer dans les pages de réservation
