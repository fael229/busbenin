-- Politique RLS pour permettre aux admins de voir toutes les réservations
CREATE POLICY "Admins can view all reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
);

-- Politique RLS pour permettre aux compagnies de voir leurs réservations
CREATE POLICY "Companies can view their reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.trajets t ON t.compagnie_id = p.compagnie_id
    WHERE p.id = auth.uid()
    AND p.admin = false
    AND p.compagnie_id IS NOT NULL
    AND t.id = reservations.trajet_id
  )
);

-- Politique pour permettre aux admins de mettre à jour toutes les réservations
CREATE POLICY "Admins can update all reservations"
ON public.reservations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
);

-- Politique pour permettre aux compagnies de mettre à jour leurs réservations
CREATE POLICY "Companies can update their reservations"
ON public.reservations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.trajets t ON t.compagnie_id = p.compagnie_id
    WHERE p.id = auth.uid()
    AND p.admin = false
    AND p.compagnie_id IS NOT NULL
    AND t.id = reservations.trajet_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.trajets t ON t.compagnie_id = p.compagnie_id
    WHERE p.id = auth.uid()
    AND p.admin = false
    AND p.compagnie_id IS NOT NULL
    AND t.id = reservations.trajet_id
  )
);
