# GoodyFans Platform - Guide de Déploiement

## 🚀 Configuration des Edge Functions Supabase

Les Edge Functions sont essentielles pour le bon fonctionnement de la plateforme, notamment pour:
- L'upload de fichiers vers Cloudflare R2
- La modération automatique de contenu avec Azure

### 1. Déploiement des Edge Functions

Pour déployer les Edge Functions, vous avez deux options:

#### Option 1: Déploiement via l'interface Supabase

1. Allez dans votre [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Naviguez vers "Edge Functions"
4. Cliquez sur "New Function" pour chaque fonction:
   - `upload-presigned`
   - `moderate-content`
   - `delete-file`
   - `cleanup-r2`
5. Copiez le code correspondant depuis les fichiers dans `supabase/functions/`

#### Option 2: Déploiement via CLI Supabase (recommandé)

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer toutes les fonctions
supabase functions deploy
```

### 2. Configuration des Variables d'Environnement

Dans votre Dashboard Supabase > Edge Functions > Environment Variables, ajoutez:

**Pour Cloudflare R2:**
```
CLOUDFLARE_ACCOUNT_ID=votre_id_compte
CLOUDFLARE_ACCESS_KEY_ID=votre_clé_accès
CLOUDFLARE_SECRET_ACCESS_KEY=votre_clé_secrète
CLOUDFLARE_BUCKET_NAME=votre_bucket
CLOUDFLARE_PUBLIC_URL=votre_url_publique
```

**Pour Azure Content Moderator:**
```
AZURE_CONTENT_MODERATOR_ENDPOINT=https://votre-ressource.cognitiveservices.azure.com/
AZURE_CONTENT_MODERATOR_KEY=votre_clé_souscription
AZURE_REGION=francecentral
```

⚠️ **IMPORTANT:** N'utilisez PAS le préfixe `VITE_` pour les variables d'environnement des Edge Functions!

### 3. Vérification du Déploiement

Après le déploiement, vérifiez que:
1. Les fonctions apparaissent comme "Active" dans le Dashboard
2. Les variables d'environnement sont correctement configurées
3. Les logs ne montrent pas d'erreurs

## 🛡️ Dépannage de la Modération

Si vous rencontrez des problèmes avec la modération:

### Problème: Trop de flags redondants

La solution est déployée! Le système va maintenant:
- Normaliser les flags pour éviter les doublons
- Standardiser les noms de flags (ex: `studio_context_detected` → `studio_context`)
- Réduire les faux positifs pour les images de studio et d'équipement technique

### Problème: Erreurs de relation entre tables

La migration SQL incluse corrige les problèmes de relation entre les tables `content_moderation` et `ppvcontent`/`mediafile`.

### Problème: Edge Functions non accessibles

Si les Edge Functions ne répondent pas:
1. Vérifiez qu'elles sont bien déployées et actives
2. Vérifiez les variables d'environnement
3. Consultez les logs pour voir les erreurs
4. Redéployez les fonctions si nécessaire

## 📋 Commandes Utiles

```bash
# Vérifier le statut des Edge Functions
supabase functions list

# Voir les logs d'une fonction
supabase functions logs moderate-content

# Redéployer une fonction spécifique
supabase functions deploy moderate-content

# Exécuter les migrations SQL
supabase migration up
```

## 🔧 Mode de Secours

L'application est configurée pour fonctionner même si les Edge Functions ne sont pas disponibles:
- Upload de fichiers: fallback vers Data URLs
- Modération: système de modération local simplifié

Cependant, pour une expérience optimale, il est recommandé de configurer correctement les Edge Functions.