import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  BusinessList: undefined;
  ArticleList: { businessId: string; businessName: string };
};

export type BusinessListScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'BusinessList'>;
};

export type ArticleListScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ArticleList'>;
  route: RouteProp<RootStackParamList, 'ArticleList'>;
};