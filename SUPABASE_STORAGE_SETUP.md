# Configuration Supabase Storage pour les Images

## Étape 1 : Créer le bucket "images"

1. Allez dans **Supabase Dashboard** → **Storage**
2. Cliquez sur **New bucket**
3. Nom du bucket : `images`
4. **Public bucket** : ✅ Cochez cette case (pour que les images soient accessibles publiquement)
5. Cliquez sur **Create bucket**

## Étape 2 : Configurer les politiques de sécurité (RLS)

Une fois le bucket créé, allez dans **Storage** → **Policies** et créez ces politiques :

### Politique 1 : Permettre à tous de lire les images

```sql
CREATE POLICY "Les images sont accessibles publiquement"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');
```

### Politique 2 : Permettre aux utilisateurs authentifiés d'uploader

```sql
CREATE POLICY "Les utilisateurs peuvent uploader leurs images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'vehicules'
);
```

### Politique 3 : Permettre aux utilisateurs de supprimer leurs propres images

```sql
CREATE POLICY "Les utilisateurs peuvent supprimer leurs images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'vehicules'
  AND auth.uid()::text = (storage.foldername(name))[2]
);
```

## Étape 3 : Configuration des limites (optionnel)

Dans **Storage Settings**, vous pouvez configurer :

- **Taille maximale du fichier** : 5 MB (recommandé)
- **Types de fichiers autorisés** : image/jpeg, image/png, image/webp

## ✅ Vérification

Une fois configuré :

1. Dans l'app mobile, allez dans "Proposer un véhicule"
2. Appuyez sur la zone d'upload
3. Sélectionnez une image
4. L'image devrait s'uploader automatiquement
5. Un aperçu apparaît avec un bouton X pour la supprimer

## 🔧 Dépannage

Si vous avez une erreur lors de l'upload :

- Vérifiez que le bucket `images` existe
- Vérifiez que le bucket est **public**
- Vérifiez que les politiques RLS sont bien configurées
- Regardez les logs dans Supabase Dashboard → Storage → Logs
