'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useStore, UserProfile } from '@/lib/store';
import { authService } from '@/lib/services/authService';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setIsAuthReady, clearAuth } = useStore();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Listen to user profile
        unsubscribeProfile = authService.subscribeToUserProfile(user.uid, (profileData) => {
          if (profileData) {
            setProfile(profileData as UserProfile);
          } else {
            // Profile doesn't exist yet, we might need to create it or wait for onboarding
            setProfile(null);
          }
        }, (error) => {
          console.error("Error fetching profile:", error);
          setProfile(null);
        });

        setIsAuthReady(true);
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = undefined;
        }
        clearAuth();
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [setUser, setProfile, setIsAuthReady, clearAuth]);

  return <>{children}</>;
}
