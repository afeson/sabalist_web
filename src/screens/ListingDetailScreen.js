import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getListing, deleteListing, markListingAsSold, reactivateListing, incrementListingViews } from '../services/listings';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { listingId } = route.params;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadListing();
  }, [listingId]);

  // Increment view count (but not for owner)
  useEffect(() => {
    if (listing && !isOwner) {
      incrementListingViews(listingId);
    }
  }, [listing, isOwner]);

  const loadListing = async () => {
    try {
      setLoading(true);
      const data = await getListing(listingId);
      setListing(data);
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Error', 'Failed to load listing');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteListing(listingId);
              Alert.alert('Success', 'Listing deleted successfully');
              navigation.goBack();
            } catch (error) {
              setDeleting(false);
              Alert.alert('Error', 'Failed to delete listing: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleMarkAsSold = async () => {
    const isSold = listing.status === 'sold';
    
    Alert.alert(
      isSold ? 'Reactivate Listing' : 'Mark as Sold',
      isSold 
        ? 'Do you want to reactivate this listing and make it visible in the marketplace again?'
        : 'Mark this item as sold? It will be hidden from the marketplace but remain in "My Listings".',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSold ? 'Reactivate' : 'Mark as Sold',
          onPress: async () => {
            try {
              if (isSold) {
                await reactivateListing(listingId);
                loadListing(); // Refresh
                Alert.alert(
                  '✅ Reactivated!',
                  'Your listing is now active and visible in the marketplace again.',
                  [{ text: 'OK' }]
                );
              } else {
                await markListingAsSold(listingId);
                loadListing(); // Refresh
                Alert.alert(
                  '✅ Marked as Sold!',
                  'Your listing is now hidden from the marketplace but still visible in "My Listings".',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update listing: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditListing', { listingId, listing });
  };

  const handleReport = () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to report listings');
      return;
    }

    Alert.alert(
      'Report Listing',
      'Why are you reporting this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => submitReport('spam')
        },
        {
          text: 'Fraud/Scam',
          onPress: () => submitReport('fraud')
        },
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate')
        },
        {
          text: 'Duplicate Listing',
          onPress: () => submitReport('duplicate')
        },
      ]
    );
  };

  const submitReport = async (reason) => {
    try {
      await addDoc(collection(db, 'reports'), {
        listingId,
        listingTitle: listing.title,
        reportedBy: auth.currentUser.uid,
        sellerUserId: listing.userId,
        reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      Alert.alert('Thank You', 'Report submitted successfully. We\'ll review it shortly.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      const shareMessage = `🛍️ ${listing.title}\n\n💰 ${formatPrice(listing.price, listing.currency)}\n📍 ${listing.location}\n📞 ${listing.phoneNumber}\n\n${listing.description}\n\n🌍 View on Sabalist`;
      
      await Share.share({
        message: shareMessage,
        title: `${listing.title} - Sabalist`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleContact = () => {
    if (!listing.phoneNumber) {
      Alert.alert('No Contact Info', 'Seller has not provided a phone number');
      return;
    }

    Alert.alert(
      'Contact Seller',
      `Phone: ${listing.phoneNumber}\n\nHow would you like to contact the seller?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📞 Call',
          onPress: () => {
            const phoneUrl = `tel:${listing.phoneNumber}`;
            Linking.openURL(phoneUrl).catch(() => {
              Alert.alert('Error', 'Unable to open phone dialer');
            });
          },
        },
        {
          text: '💬 WhatsApp',
          onPress: () => {
            // Format phone number for WhatsApp (remove spaces, dashes, etc)
            const cleanNumber = listing.phoneNumber.replace(/[^0-9+]/g, '');
            const message = `Hi! I'm interested in your listing: ${listing.title}\n\nPrice: ${formatPrice(listing.price, listing.currency)}\nLocation: ${listing.location}`;
            const whatsappUrl = `whatsapp://send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`;
            
            Linking.canOpenURL(whatsappUrl).then(supported => {
              if (supported) {
                Linking.openURL(whatsappUrl);
              } else {
                // Fallback to web WhatsApp
                const webUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
                Linking.openURL(webUrl);
              }
            }).catch(() => {
              Alert.alert('Error', 'Unable to open WhatsApp. Please make sure it is installed.');
            });
          },
        },
        {
          text: 'Copy Number',
          onPress: () => Alert.alert('Copied', `${listing.phoneNumber} copied to clipboard`),
        },
      ]
    );
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price) return 'Price on request';
    return `${currency} ${Number(price).toLocaleString()}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOwner = listing && auth.currentUser && listing.userId === auth.currentUser.uid;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E11D48" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const images = listing.images || [];
  const hasImages = images.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listing Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
          {isOwner && (
            <>
              <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
                <Ionicons name="create-outline" size={24} color="#1F2937" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconButton} disabled={deleting}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        {hasImages ? (
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {images.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.image} />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.pagination}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={64} color="#D1D5DB" />
            <Text style={styles.noImageText}>No images available</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Price */}
          <Text style={styles.price}>{formatPrice(listing.price, listing.currency)}</Text>

          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
              <Text style={styles.metaText}>{listing.category || 'General'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <Text style={styles.metaText}>{listing.location || 'Location not specified'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={styles.metaText}>
                Posted {formatDate(listing.createdAt)}
              </Text>
            </View>
            {listing.views > 0 && (
              <View style={styles.metaRow}>
                <Ionicons name="eye-outline" size={18} color="#6B7280" />
                <Text style={styles.metaText}>
                  {listing.views} {listing.views === 1 ? 'view' : 'views'}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {listing.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>
          ) : null}

          {/* Sold Badge */}
          {listing.status === 'sold' && (
            <View style={styles.soldBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.soldBannerText}>SOLD</Text>
            </View>
          )}

          {/* Contact Button (if not owner and not sold) */}
          {!isOwner && listing.status !== 'sold' && (
            <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
              <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Seller</Text>
            </TouchableOpacity>
          )}

          {/* Mark as Sold Button (if owner) */}
          {isOwner && (
            <TouchableOpacity 
              style={[
                styles.soldButton,
                listing.status === 'sold' && styles.reactivateButton
              ]} 
              onPress={handleMarkAsSold}
            >
              <Ionicons 
                name={listing.status === 'sold' ? "refresh-outline" : "checkmark-circle-outline"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.soldButtonText}>
                {listing.status === 'sold' ? 'Reactivate Listing' : 'Mark as Sold'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Owner Badge */}
          {isOwner && (
            <View style={styles.ownerBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.ownerBadgeText}>This is your listing</Text>
            </View>
          )}

          {/* Report Button (if not owner) */}
          {!isOwner && (
            <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
              <Ionicons name="flag-outline" size={16} color="#DC2626" />
              <Text style={styles.reportButtonText}>Report this listing</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    position: 'relative',
  },
  image: {
    width: width,
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
  },
  noImageContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  noImageText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  content: {
    padding: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: '#E11D48',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 32,
  },
  metaContainer: {
    gap: 12,
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  soldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  reactivateButton: {
    backgroundColor: '#10B981',
  },
  soldButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  soldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  soldBannerText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  ownerBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    gap: 6,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
  },
});


