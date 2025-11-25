-- Table des véhicules mis en location par les particuliers
CREATE TABLE IF NOT EXISTS public.vehicules_location (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    marque TEXT NOT NULL,
    modele TEXT NOT NULL,
    annee INTEGER,
    immatriculation TEXT,
    prix_par_jour DECIMAL(10, 2) NOT NULL,
    description TEXT,
    photo_url TEXT,
    disponible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des réservations de location
CREATE TABLE IF NOT EXISTS public.reservations_location (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicule_id UUID REFERENCES public.vehicules_location(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Le locataire
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    montant_total DECIMAL(10, 2) NOT NULL,
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'terminee', 'annulee')),
    transaction_id TEXT, -- Référence FedaPay
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Sécurité)
ALTER TABLE public.vehicules_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations_location ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les véhicules disponibles
CREATE POLICY "Voir les véhicules disponibles" ON public.vehicules_location
    FOR SELECT USING (true);

-- Les utilisateurs peuvent ajouter des véhicules
CREATE POLICY "Ajouter un véhicule" ON public.vehicules_location
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent modifier leurs propres véhicules
CREATE POLICY "Modifier ses propres véhicules" ON public.vehicules_location
    FOR UPDATE USING (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres véhicules
CREATE POLICY "Supprimer ses propres véhicules" ON public.vehicules_location
    FOR DELETE USING (auth.uid() = user_id);

-- Policies pour les réservations
-- Le locataire peut voir ses réservations
CREATE POLICY "Voir ses réservations (locataire)" ON public.reservations_location
    FOR SELECT USING (auth.uid() = user_id);

-- Le propriétaire du véhicule peut voir les réservations sur ses véhicules
CREATE POLICY "Voir les réservations (propriétaire)" ON public.reservations_location
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vehicules_location
            WHERE vehicules_location.id = reservations_location.vehicule_id
            AND vehicules_location.user_id = auth.uid()
        )
    );

-- Créer une réservation
CREATE POLICY "Créer une réservation" ON public.reservations_location
    FOR INSERT WITH CHECK (auth.uid() = user_id);
