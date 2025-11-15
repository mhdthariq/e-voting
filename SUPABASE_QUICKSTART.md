# 🚀 Quick Start: Supabase Setup for BlockVote

Follow these simple steps to set up Supabase for profile images and email verification.

## Step 1: Create Supabase Project (5 minutes)

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `blockvote` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** and wait ~2 minutes

## Step 2: Get Your API Keys (1 minute)

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: Starts with `eyJhbGc...`
   - **service_role key**: Also starts with `eyJhbGc...` (keep secret!)

## Step 3: Update Your .env File (2 minutes)

Add to your `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-key-here"
SUPABASE_STORAGE_BUCKET="profile-images"
```

## Step 4: Create Storage Bucket (3 minutes)

1. In Supabase dashboard, go to **Storage**
2. Click **"Create a new bucket"**
3. Enter:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ YES (check this!)
4. Click **"Create bucket"**

## Step 5: Set Storage Policies (2 minutes)

1. Click on your `profile-images` bucket
2. Go to **Policies** tab
3. Click **"New Policy"** → **"For full customization"**
4. Add this policy for **SELECT (read)**:

```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');
```

5. Add this policy for **INSERT (upload)**:

```sql
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images');
```

6. Add this policy for **DELETE**:

```sql
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images');
```

## Step 6: Test It! (1 minute)

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Log in to your BlockVote account
3. Go to **Settings** (add /settings to URL)
4. Try uploading a profile photo!

## ✅ You're Done!

Your BlockVote now has:
- ✅ Profile photo upload (auto-converts to WebP!)
- ✅ Images stored on Supabase CDN
- ✅ Fast image delivery worldwide

## 🔧 Troubleshooting

### "Supabase not configured" warning
- Make sure you copied the `.env.example` variables to `.env`
- Restart your dev server after adding keys

### Upload fails with "Policy violation"
- Make sure bucket is **public**
- Check that policies are added correctly
- Policies might take a minute to activate

### Images don't show
- Check that `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify bucket name matches `SUPABASE_STORAGE_BUCKET`

## 📚 Optional: Email Verification Setup

Want to use Supabase for email too? See `SUPABASE_INTEGRATION.md` for detailed instructions.

## 💡 Pro Tips

1. **Free tier**: Supabase free tier includes:
   - 1GB database storage
   - 1GB file storage  
   - 2GB bandwidth/month
   - More than enough to start!

2. **Production**: When deploying:
   - Use environment variables in your hosting
   - Never commit `.env` to git
   - Rotate service_role key regularly

3. **Monitoring**: Check Supabase dashboard for:
   - Storage usage
   - API calls
   - Database size

---

**Need Help?** See the full guide in `SUPABASE_INTEGRATION.md`
