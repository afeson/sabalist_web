import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../theme';

// Screens
import HomeScreenSimple from '../screens/HomeScreenSimple';
import FavoritesScreen from '../screens/FavoritesScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import TermsPrivacyScreen from '../screens/TermsPrivacyScreen';
import AboutScreen from '../screens/AboutScreen';
import SubCategoriesScreen from '../screens/SubCategoriesScreen';
import CategoryListingsScreen from '../screens/CategoryListingsScreen';
import CityListingsScreen from '../screens/CityListingsScreen';
import { withAuthGate } from '../components/RequireAuth';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Private screens require a signed-in user. On web, logged-out visitors can
// browse public marketplace screens (home/category/search/listing) but hitting
// any of these renders the auth screen. On native this is a no-op (logged-out
// users never reach the navigator). Wrapped at module scope so the component
// identity stays stable and the screens don't remount on every render.
const GuardedFavorites = withAuthGate(FavoritesScreen);
const GuardedCreateListing = withAuthGate(CreateListingScreen);
const GuardedMyListings = withAuthGate(MyListingsScreen);
const GuardedProfile = withAuthGate(ProfileScreen);
const GuardedEditProfile = withAuthGate(EditProfileScreen);
const GuardedNotifications = withAuthGate(NotificationsScreen);

// Android phones get a slightly smaller floating + button so it doesn't
// crowd the listings grid on narrow screens. Tablets and iOS unchanged.
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_ANDROID_PHONE = Platform.OS === 'android' && SCREEN_WIDTH < 600;
const CENTER_BUTTON_SIZE = IS_ANDROID_PHONE ? 52 : 60;
const CENTER_BUTTON_ICON = IS_ANDROID_PHONE ? 28 : 32;
const CENTER_BUTTON_LIFT = IS_ANDROID_PHONE ? -16 : -20;
const CENTER_BUTTON_CONTAINER = IS_ANDROID_PHONE ? 60 : 70;

// Custom center button
function CenterButton({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.centerButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={CENTER_BUTTON_ICON} color={COLORS.card} />
    </TouchableOpacity>
  );
}

// Bottom Tab Navigator
function TabNavigator() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [, forceUpdate] = useState(0);

  // Force re-render when language changes to update tab labels
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [i18n.language]);

  return (
    <Tab.Navigator
      key={i18n.language}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        // Hide the bottom tab bar while creating a listing so its absolute
        // positioning can't cover the step's Next/Post button. The header X
        // in CreateListingScreen handles exiting back to the previous tab.
        tabBarStyle: route.name === 'CreateListing'
          ? { display: 'none' }
          : {
              ...styles.tabBar,
              paddingBottom: Math.max(insets.bottom, 10),
              height: Platform.OS === 'ios' ? 85 : 70 + Math.max(insets.bottom - 10, 0),
            },
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Favorites':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'CreateListing':
              iconName = 'add';
              break;
            case 'MyListings':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreenSimple}
        options={{
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={GuardedFavorites}
        options={{
          tabBarLabel: t('tabs.favorites'),
        }}
      />
      <Tab.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => (
            <View style={styles.centerButtonContainer}>
              <CenterButton onPress={props.onPress} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MyListings"
        component={GuardedMyListings}
        options={{
          tabBarLabel: t('tabs.myListings'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={GuardedProfile}
        options={{
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
  );
}

// Main Navigator with Stack (wraps tabs and adds detail screens)
export default function MainTabNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={GuardedEditProfile}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={GuardedNotifications}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="TermsPrivacy"
        component={TermsPrivacyScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="SubCategories"
        component={SubCategoriesScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="CategoryListings"
        component={CategoryListingsScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="CityListings"
        component={CityListingsScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: Platform.OS === 'web' ? 'relative' : 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    ...SHADOWS.large,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -4,
  },
  centerButtonContainer: {
    top: CENTER_BUTTON_LIFT,
    justifyContent: 'center',
    alignItems: 'center',
    width: CENTER_BUTTON_CONTAINER,
  },
  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.fab,
  },
});
