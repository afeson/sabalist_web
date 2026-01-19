import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import EditListingScreen from '../screens/EditListingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom tab bar button for center "+" button
function CenterTabButton({ children, onPress }) {
  return (
    <View style={styles.centerButtonContainer}>
      <View style={styles.centerButton}>
        {children}
      </View>
    </View>
  );
}

// Bottom Tab Navigator
function TabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyListings') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'CreateListing') {
            iconName = 'add';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tab.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{
          tabBarLabel: t('tabs.myListings'),
        }}
      />
      <Tab.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <CenterTabButton {...props} />,
          tabBarIcon: ({ color }) => (
            <Ionicons name="add" size={32} color={COLORS.card} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator with Stack
export default function AppNavigator() {
  const { t } = useTranslation();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="ListingDetail"
          component={ListingDetailScreen}
          options={{
            headerShown: true,
            headerTitle: t('navigation.listingDetails'),
            headerBackTitle: t('navigation.back'),
            headerTintColor: COLORS.primary,
          }}
        />
        <Stack.Screen
          name="EditListing"
          component={EditListingScreen}
          options={{
            headerShown: true,
            headerTitle: t('navigation.editListing'),
            headerBackTitle: t('navigation.back'),
            headerTintColor: COLORS.primary,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

