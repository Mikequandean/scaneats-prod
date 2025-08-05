
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useToast } from '@/app/shared/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Button } from '@/app/shared/components/ui/button';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/app/domain/profile';
import type { ScannedFood } from '@/app/domain/scanned-food';
import { ProfileService } from '@/app/features/profile/application/profile.service';
import { ProfileApiRepository } from '@/app/data/profile/profile-api.repository';


type UserDataContextType = {
  profile: Profile | null;
  initialProfile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  scannedFood: ScannedFood | null | undefined; // undefined for loading, null for no food
  setScannedFood: (food: ScannedFood | null) => void;
  isLoading: boolean;
  saveProfile: (profile: Profile) => Promise<boolean>;
  fetchProfile: () => void;
  isSubscriptionModalOpen: boolean;
  setSubscriptionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined
);

const initialProfileState: Profile = {
  id: null,
  name: '',
  gender: 'Prefer not to say',
  weight: '',
  goals: '',
  birthDate: null,
  isSubscribed: false,
  credits: 0,
};

// Instantiate repository and service
const profileRepository = new ProfileApiRepository();
const profileService = new ProfileService(profileRepository);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(initialProfileState);
  const [initialProfile, setInitialProfile] = useState<Profile | null>(initialProfileState);
  const [scannedFood, setScannedFoodState] = useState<ScannedFood | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  
  const setScannedFood = (food: ScannedFood | null) => {
    setScannedFoodState(food);
  }

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
        setIsLoading(false);
        setProfile(initialProfileState);
        setInitialProfile(JSON.parse(JSON.stringify(initialProfileState)));
        return;
    }

    try {
        const { profile: userProfile, isSubscribed } = await profileService.getProfile(token);
        
        const finalProfile = { ...(userProfile || initialProfileState), isSubscribed };
        setProfile(finalProfile);
        setInitialProfile(JSON.parse(JSON.stringify(finalProfile)));

    } catch (error: any) {
        if (error.message === 'Session Expired') {
             toast({
                variant: 'destructive',
                title: 'Session Expired',
                description: 'Please log in again to continue.',
            });
            localStorage.clear();
            router.push('/login');
        } else {
            console.error('Failed to load user data', error);
            const finalProfile = { ...initialProfileState, isSubscribed: false };
            setProfile(finalProfile);
            setInitialProfile(JSON.parse(JSON.stringify(finalProfile)));
        }
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const saveProfile = useCallback(
    async (profileData: Profile): Promise<boolean> => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
        return false;
      }

      try {
        const savedProfile = await profileService.saveProfile(token, profileData);
        setProfile(savedProfile);
        setInitialProfile(JSON.parse(JSON.stringify(savedProfile)));
        return true;
      } catch (error: any) {
        console.error('Save profile error:', error);
        if (error.message === 'Subscription Required') {
            setSubscriptionModalOpen(true);
        } else {
            toast({
              variant: 'destructive',
              title: 'Save Failed',
              description: error.message || 'An unknown error occurred.',
            });
        }
        return false;
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const value = {
    profile,
    initialProfile,
    setProfile,
    scannedFood,
    setScannedFood,
    isLoading,
    saveProfile,
    fetchProfile,
    isSubscriptionModalOpen,
    setSubscriptionModalOpen,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
      <AlertDialog
        open={isSubscriptionModalOpen}
        onOpenChange={setSubscriptionModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Subscription Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need an active subscription to access this feature. Please
              subscribe to unlock all features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/pricing">Subscribe Now</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}
