# ⚙️ Settings Page - User Guide

The settings page is now fully implemented and ready to use! Access it at `/settings` when logged in.

## 🎯 Features

### For All Users
- ✅ **Profile Photo Upload**: Upload and auto-convert images to WebP
- ✅ **Change Password**: Update your password securely
- ✅ **Profile Information**: Update your full name

### Role-Specific Features

#### 👤 Regular Users & Admins
- Change username
- Change full name
- Upload profile photo
- Change password

#### 🏢 Organizations
- Upload organization logo
- Change password
- Change organization name
- **Cannot** change username (security locked)

## 📁 Files Implemented

### Frontend
- ✅ `/src/app/settings/page.tsx` - Main settings page (16KB, fully working)

### Backend APIs  
- ✅ `/src/app/api/user/profile/route.ts` - Update profile endpoint
- ✅ `/src/app/api/user/password/route.ts` - Change password endpoint

### Utilities
- ✅ `/src/lib/supabase/client.ts` - Supabase client configuration
- ✅ `/src/lib/supabase/storage.ts` - Image upload/delete functions
- ✅ `/src/lib/utils/imageOptimizer.ts` - WebP conversion

## 🚀 How to Use

### 1. Access Settings

**As User:**
- Log in to your account
- Navigate to `/settings` or add a Settings link to your dashboard

**As Organization:**
- Log in to your organization account
- Navigate to `/settings`

### 2. Upload Profile Photo

1. Click **"Upload Photo"** button
2. Select any image (JPG, PNG, GIF, WebP)
3. Image is automatically:
   - Resized to max 800x800px
   - Converted to WebP format
   - Compressed (typically 50-70% smaller!)
   - Uploaded to Supabase Storage
4. Old photo is automatically deleted

**Note**: Supabase must be configured (see SUPABASE_QUICKSTART.md)

### 3. Update Profile Information

1. Edit Username (if allowed)
2. Edit Full Name / Organization Name
3. Click **"Save Changes"**

**Username Rules:**
- ❌ Organizations **cannot** change username
- ✅ Users and Admins can change username
- Must be unique

### 4. Change Password

1. Enter your current password
2. Enter new password (min 8 characters)
3. Confirm new password
4. Click **"Change Password"**

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## 🔧 Configuration

### Environment Variables Needed

```env
# Required for authentication
JWT_SECRET="your-jwt-secret-here"

# Optional - for profile photos (see SUPABASE_QUICKSTART.md)
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
SUPABASE_STORAGE_BUCKET="profile-images"
```

### Without Supabase

The settings page works even without Supabase:
- ✅ Change username
- ✅ Change full name  
- ✅ Change password
- ❌ Upload profile photo (disabled with warning)

### With Supabase

Everything works + profile photo upload!

## 📊 Features in Detail

### Profile Photo Upload

**Process:**
1. User selects image
2. Browser resizes image (max 800x800)
3. Browser converts to WebP (80% quality)
4. Uploads to Supabase Storage
5. Gets public URL
6. Saves URL to database
7. Deletes old image (if exists)

**Benefits:**
- Fast loading (WebP is smaller)
- Global CDN delivery (Supabase)
- No server processing needed
- Automatic compression

### Security

**Authentication:**
- JWT token required
- Token verified on each request
- User can only update own data

**Validation:**
- Username uniqueness checked
- Password strength validated
- File size limited to 5MB
- File type validated (images only)

**Audit Logging:**
- All profile changes logged
- Password changes logged
- IP address tracked
- User agent tracked

## 🎨 UI/UX Features

**Responsive Design:**
- Mobile-friendly
- Tablet optimized
- Desktop enhanced

**User Feedback:**
- Loading states (spinners)
- Success messages (green)
- Error messages (red)
- Form validation
- Disabled states

**Accessibility:**
- Semantic HTML
- Keyboard navigation
- Screen reader friendly
- Focus indicators
- Proper labels

## 🧪 Testing

### Manual Testing Checklist

**Profile Photo:**
- [ ] Upload JPG image
- [ ] Upload PNG image
- [ ] Upload WebP image
- [ ] Try uploading too large file (>5MB)
- [ ] Try uploading non-image file
- [ ] Verify old photo deleted
- [ ] Check photo displays correctly

**Profile Information:**
- [ ] Change username (user/admin)
- [ ] Try duplicate username (should fail)
- [ ] Change full name
- [ ] Verify organization can't change username
- [ ] Check validation errors

**Password Change:**
- [ ] Change password successfully
- [ ] Try wrong current password (should fail)
- [ ] Try weak password (should fail)
- [ ] Try mismatched passwords (should fail)
- [ ] Verify can login with new password

## 🐛 Troubleshooting

### "Supabase not configured" warning

**Problem**: Image upload button shows warning

**Solution**:
1. Check `.env` file has Supabase variables
2. See `SUPABASE_QUICKSTART.md` for setup
3. Restart dev server after adding variables

### "Username already taken"

**Problem**: Can't save username

**Solution**: Try different username - must be unique

### "Current password is incorrect"

**Problem**: Can't change password

**Solution**: Make sure current password is correct

### Image upload fails

**Problem**: Upload button doesn't work

**Possible Causes:**
1. Supabase not configured → Add to .env
2. Storage bucket not created → See quickstart
3. Storage policies not set → Check Supabase dashboard
4. File too large → Max 5MB
5. Wrong file type → Only images allowed

### Profile changes don't save

**Possible Causes:**
1. Not logged in → Check JWT token
2. Network error → Check console
3. Server error → Check API logs
4. Validation error → Read error message

## 📈 Future Enhancements

Possible additions (not yet implemented):

- [ ] Email change (with verification)
- [ ] Two-factor authentication
- [ ] Session management
- [ ] Activity log viewer
- [ ] Profile visibility settings
- [ ] Account deletion
- [ ] Export personal data

## 💻 Code Examples

### Add Settings Link to Dashboard

```tsx
import Link from 'next/link';

// In your dashboard component
<Link href="/settings">
  <button className="px-4 py-2 bg-blue-600 text-white rounded">
    Settings
  </button>
</Link>
```

### Check if Supabase is Configured

```tsx
import { isSupabaseConfigured } from '@/lib/supabase/client';

if (isSupabaseConfigured()) {
  // Show upload button
} else {
  // Show warning
}
```

### Upload Image Programmatically

```tsx
import { uploadProfileImage } from '@/lib/supabase/storage';
import { optimizeImage } from '@/lib/utils/imageOptimizer';

const file = /* get file from input */;
const optimized = await optimizeImage({ file });
const result = await uploadProfileImage({
  userId: 123,
  file: optimized.file
});

if (result.success) {
  console.log('Uploaded:', result.url);
}
```

## 📞 Support

**Documentation:**
- Main guide: `SUPABASE_INTEGRATION.md`
- Quick setup: `SUPABASE_QUICKSTART.md`
- This guide: `SETTINGS_GUIDE.md`

**Need Help?**
- Check troubleshooting section above
- Review SUPABASE_INTEGRATION.md
- Check browser console for errors
- Check server logs for API errors

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: ✅ Fully Implemented and Working
