
export type UserRole = 'customer' | 'shop_owner' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  phoneNumber: string;
  password?: string;
  address?: string;
  pinCode: string;   
  city: string;      
  locality?: string; 
  rating: number;
  totalRatings: number;
  isVerified?: boolean;
}

export interface ShopProfile extends UserProfile {
  shopName: string;
  category: string;
  shopImage?: string;
  description?: string;
  promoBanner?: string;
}

export interface DailyUpdate {
  id: string;
  shopId: string;
  shopName: string;
  text: string;
  image?: string;
  createdAt: number;
  expiresAt: number;
}

export type RequestStatus = 'drafting' | 'summarized' | 'broadcasted' | 'fulfilled' | 'cancelled';

export interface ProductRequest {
  id: string;
  customerId: string;
  customerName: string;
  pinCode: string;   
  city: string;
  locality?: string;
  category: string;
  description: string;
  status: RequestStatus;
  createdAt: number;
  image?: string;
}

export interface DirectMessage {
  senderId: string;
  text: string;
  timestamp: number;
}

export interface GroundingChunk {
  maps?: {
    uri: string;
    title: string;
  };
}

export interface Offer {
  id: string;
  requestId: string;
  shopId: string;
  shopName: string;
  shopRating: number;
  price: number;
  productImage?: string;
  message?: string;
  chatHistory?: DirectMessage[];
  createdAt: number;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface Order {
  id: string;
  requestId: string;
  offerId: string;
  customerId: string;
  shopId: string;
  deliveryAddress: string;
  pinCode: string;
  city: string;
  status: 'pending' | 'out_for_delivery' | 'delivered';
  customerRated: boolean;
  shopRated: boolean;
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  parts: { 
    text?: string; 
    inlineData?: { mimeType: string; data: string };
  }[];
  groundingChunks?: GroundingChunk[];
}

export interface MarketplaceStats {
  totalUsers: number;
  totalShops: number;
  totalRequests: number;
  totalOrders: number;
  conversionRate: number;
  activeCategories: Record<string, number>;
}
