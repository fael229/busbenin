Je vais vous expliquer en détail tout le code de l'application Bus Bénin :

🏗️ Architecture générale
L'application suit une architecture 3-tiers :

Frontend mobile (React Native/Expo)
API Backend (Node.js)
Base de données (PostgreSQL)

📱 Frontend Mobile - Structure
Navigation par onglets (/apps/mobile/src/app/(tabs)/_layout.jsx)
javascript


<!-- <Tabs screenOptions={{
  tabBarActiveTintColor: '#1E88E5',    // Bleu actif
  tabBarInactiveTintColor: '#6B7280',  // Gris inactif
  headerShown: false                   // Pas de header global
}}> -->

Rôle : Configure 4 onglets (Accueil, Trajets, Compagnies, Favoris) avec design iOS moderne.

Écran d'accueil (/apps/mobile/src/app/(tabs)/index.jsx)
javascript


<!-- const handleSearch = () => {
  router.push(`/trajets?depart=${depart}&arrivee=${arrivee}`);
}; -->

Fonctionnalités :

Formulaire de recherche départ/arrivée
Liste des trajets populaires via API
Navigation vers la page résultats
Recherche de trajets (/apps/mobile/src/app/(tabs)/trajets.jsx)
javascript


<!-- const searchTrajets = async () => {
  const searchParams = new URLSearchParams();
  if (depart) searchParams.append('depart', depart);
  const response = await fetch(`/api/trajets?${searchParams}`);
  const data = await response.json();
  setTrajets(data);
}; -->

Logique :

Construit des paramètres de recherche dynamiques
Appelle l'API /api/trajets avec filtres
Affiche les résultats en temps réel
Détail d'un trajet (/apps/mobile/src/app/trajet/[id].jsx)
javascript


<!-- const handleWhatsApp = (telephone) => {
  const message = `Bonjour, je souhaite réserver pour ${trajet.depart} → ${trajet.arrivee}`;
  Linking.openURL(`whatsapp://send?phone=${telephone}&text=${encodeURIComponent(message)}`);
}; -->

Fonctionnalités avancées :

Récupération des détails via /api/trajets/[id]
Appel téléphonique direct avec Linking.openURL('tel:')
Message WhatsApp pré-rempli
Formulaire d'avis avec étoiles interactives
Scroll avec zone de sécurité iOS

🔧 Backend API - Structure
Route trajets (/apps/web/src/app/api/trajets/route.js)
javascript


<!-- export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const depart = searchParams.get('depart');
  
  let query = 'SELECT * FROM trajets WHERE 1=1';
  const values = [];
  
  if (depart) {
    query += ` AND LOWER(depart) LIKE LOWER($1)`;
    values.push(`%${depart}%`);
  }
  
  const trajets = await sql(query, values);
  return Response.json(trajets);
} -->

Sécurité :

Utilisation de paramètres préparés ($1, $2) contre l'injection SQL
Validation des champs obligatoires avant insertion
Gestion d'erreurs avec try/catch
Route trajet individuel (/apps/web/src/app/api/trajets/[id]/route.js)
javascript


<!-- export async function GET(request, { params }) {
  const trajet = await sql`SELECT * FROM trajets WHERE id = ${params.id}`;
  if (!trajet[0]) {
    return Response.json({ error: 'Trajet not found' }, { status: 404 });
  }
  return Response.json(trajet[0]);
} -->

Logique :

Récupération par ID depuis les paramètres d'URL
Vérification d'existence avec status HTTP approprié
Retour d'un objet unique, pas d'un tableau
Système d'avis (/apps/web/src/app/api/avis/route.js)
javascript


<!-- export async function POST(request) {
  const { trajet_id, note, utilisateur, commentaire } = await request.json();
  
  // Ajouter l'avis
  await sql`INSERT INTO avis (trajet_id, note, utilisateur, commentaire) 
            VALUES (${trajet_id}, ${note}, ${utilisateur}, ${commentaire})`;
  
  // Recalculer la note moyenne
  const stats = await sql`
    SELECT AVG(note) as moyenne, COUNT(*) as total 
    FROM avis WHERE trajet_id = ${trajet_id}
  `;
  
  // Mettre à jour le trajet
  await sql`UPDATE trajets 
            SET note = ${stats[0].moyenne}, nb_avis = ${stats[0].total}
            WHERE id = ${trajet_id}`;
} -->

Business Logic :

Transaction implicite pour cohérence des données
Recalcul automatique de la note moyenne
Mise à jour du compteur d'avis

🗄️ Base de données - Relations
Schéma relationnel
sql


trajets (1) ←→ (N) avis  -- Un trajet a plusieurs avis
compagnies (1) ←→ (N) trajets  -- Une compagnie opère plusieurs trajets
Contraintes métier
sql


CONSTRAINT avis_note_check CHECK (note >= 1 AND note <= 5)  -- Notes valides
FOREIGN KEY (trajet_id) REFERENCES trajets(id) ON DELETE CASCADE  -- Suppression en cascade
🎨 Design System
Couleurs cohérentes
javascript


<!-- const colors = {
  primary: '#1E88E5',      // Bleu principal
  background: '#F9FAFB',   // Gris très clair
  white: '#FFFFFF',        // Blanc pur
  text: '#1F2937',         // Noir texte
  textSecondary: '#6B7280', // Gris texte
  warning: '#F59E0B',      // Orange étoiles
  success: '#10B981'       // Vert WhatsApp
}; -->

Zones de sécurité iOS
javascript


const insets = useSafeAreaInsets();
// Évite l'encoche iPhone et zone home indicator
paddingTop: insets.top + 20,
paddingBottom: insets.bottom + 80

🔄 Flux de données
Recherche de trajets
User saisit départ/arrivée →
Frontend appelle /api/trajets?depart=X&arrivee=Y →
Backend construit requête SQL dynamique →
PostgreSQL retourne résultats filtrés →
Frontend affiche liste →
User clique trajet →
Navigation vers /trajet/[id]
Ajout d'avis
User remplit formulaire (nom, note, commentaire) →
Frontend POST /api/avis →
Backend INSERT dans table avis →
Backend calcule nouvelle moyenne →
Backend UPDATE table trajets →
Frontend recharge données →
UI mise à jour automatique
🛡️ Gestion d'erreurs
Frontend (UX/UI)
javascript


<!-- try {
  const response = await fetch('/api/trajets');
  if (!response.ok) throw new Error('Network error');
} catch (error) {
  console.error(error);
  Alert.alert('Erreur', 'Impossible de charger les trajets');
}
Backend (Robustesse)
javascript


try {
  const result = await sql`INSERT INTO trajets...`;
  return Response.json(result[0], { status: 201 });
} catch (error) {
  console.error('Error creating trajet:', error);
  return Response.json({ error: 'Failed to create' }, { status: 500 });
} -->

<!-- create table public.trajets (
  id uuid not null default gen_random_uuid (),
  depart text not null,
  arrivee text not null,
  prix numeric not null,
  horaires jsonb null,
  gare text null,
  note numeric(2, 1) null default 0.0,
  nb_avis integer null default 0,
  compagnie_id uuid null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint trajets_pkey primary key (id),
  constraint trajets_compagnie_id_fkey foreign KEY (compagnie_id) references compagnies (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.reservations (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  trajet_id uuid not null,
  nombre_de_places integer not null,
  statut text not null default 'confirmée'::text,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint reservations_pkey primary key (id),
  constraint reservations_trajet_id_fkey foreign KEY (trajet_id) references trajets (id) on delete CASCADE,
  constraint reservations_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint reservations_nombre_de_places_check check ((nombre_de_places > 0))
) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null,
  username text null default gen_random_uuid (),
  avatar_url text null,
  full_name text null,
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  email text null,
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint username_length check ((char_length(username) >= 3))
) TABLESPACE pg_default;

create table public.favoris (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  trajet_id uuid not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint favoris_pkey primary key (id),
  constraint favoris_user_id_trajet_id_key unique (user_id, trajet_id),
  constraint favoris_trajet_id_fkey foreign KEY (trajet_id) references trajets (id) on delete CASCADE,
  constraint favoris_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.compagnies (
  id uuid not null default gen_random_uuid (),
  nom text not null,
  logo_url text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint compagnies_pkey primary key (id)
) TABLESPACE pg_default;

create table public.avis (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  trajet_id uuid not null,
  note integer not null,
  commentaire text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint avis_pkey primary key (id),
  constraint avis_user_id_trajet_id_key unique (user_id, trajet_id),
  constraint avis_trajet_id_fkey foreign KEY (trajet_id) references trajets (id) on delete CASCADE,
  constraint avis_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint avis_note_check check (
    (
      (note >= 1)
      and (note <= 5)
    )
  )
) TABLESPACE pg_default; -->