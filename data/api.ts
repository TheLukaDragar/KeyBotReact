import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';
import { setToken } from './secure';
import { RootState } from './store';

export interface User {
  _createTime: string;
  _createUser: null;
  _updateTime: string;
  _updateUser: null;
  authUser: {
    PIN: null;
    _createTime: string;
    _createUser: null;
    _updateTime: string;
    _updateUser: null;
    email: string;
    id: number;
    passwordHash: null;
    permissions: any[];
    roles: any[];
    status: number;
    tableName: string;
    username: string;
  };
  birthDate: null;
  crypto: Array<CryptoUserData>;
  details: any[];
  firstName: null | string;
  id: number;
  lastName: null | string;
  reputation: null;
  status: number;
  tableName: string;
  userType: UserType2;
}
export interface UserName {
  firstName: null | string;
  lastName: null | string;
}
interface CryptoUserData {
  id: number;
  _createTime: string;
  _createUser: null;
  _updateTime: string;
  _updateUser: null;
  status: number;
  wallet: string;
  user_id: number;
  default: number;
  tableName: string;
}
export interface AuthResponse { //message to sign
  authToken: {
    data: string
  },
  profile: User
}
interface WalletAuthMsg {
  message: string
  timestamp: number
}
interface RegisterWallet {
  wallet: string,
  signature: string
  timestamp: number
  email?: string
  username?: string
  userType?: UserType2
}
interface connectBox {
  macAddress: string
  did: string
}
export interface GetBoxesResponse {
  items: BoxItem[];
  total: number;
}
export interface BoxItem {
  id: number;
  status: number;
  _createTime: string;
  _createUser: number;
  _updateTime: string;
  _updateUser: number;
  macAddress: string;
  did: string;
  licensePlate: null;
  approximateLocation_id: null;
  preciseLocation_id: null;
  preciseLocation: PreciseLocation;
  imageUrl: null;
  reputationThreshold: null;
  reputation: null;
  description: null;
  user_id: null;
  permission: BoxPermissionLevel,
  boxStatus?: BoxStatus
}
export interface Box {
  id: number;
  _createTime: string;
  _createUser: number;
  _updateTime: string;
  _updateUser: number;
  status: number;
  did: string;
  macAddress: string;
  licensePlate: string;
  approximateLocation_id: number;
  approximateLocation: ApproximateLocation;
  preciseLocation_id: number;
  preciseLocation: PreciseLocation;
  description: string;
  imageUrl: string;
  reputationThreshold: number;
  reputation: number;
  boxStatus?: BoxStatus;
}

export interface BoxQueryFilterDto {
  did?: string;
  macAddress?: string;
  owner_id?: number;
  forUser?: number;
  availableForDeposit?: boolean;
  boxStatus?: BoxStatus;
  location?: PreciseLocation;
  limit?: number;
  orderBy?: string;
  desc?: boolean;
}


export interface UpdateBoxDto {

  id?: number;
  licensePlate?: string;
  did?: string;
  macAddress?: string;
  key?: string;
  approximateLocation_id?: number;
  description?: string;
  imageUrl?: string;
  reputationThreshold?: number;
}

export interface ParcelQueryFilterDto {
  trackingNumber?: string;
  nftId?: string;
  transactionHash?: string;
  recipient_id?: number;
  courier_id?: number;
  box_id?: number;
  limit?: number;
  orderBy?: string;
  desc?: boolean;
  depositTime?: Date;
}

interface ApproximateLocation {
  name?: string;
  latitude: number;
  longitude: number;
  inaccuracy: number;
}
export interface PreciseLocation {
  latitude: number;
  longitude: number;
  inaccuracy: number;
}
interface setBoxPreciseLocation {
  boxId: number;
  preciseLocation: PreciseLocation;
  update?: boolean;
}
export interface getBoxAccessKeyParams {
  boxId: number;
  preciseLocation: PreciseLocation;
  challenge: string;
}
export interface getBoxAccessKeyResponse {
  boxId: number;
  accessKey: string;
}
export interface CreateParcelByUsers {
  nftId: number;
  trackingNumber: string;
  transactionHash: string;
  recipient_id: number;
  courier_id: number;
  box_id: number;
  location: PreciseLocation;

}
export interface CreateParcelByWallet {
  nftId: string;
  transactionHash: string;
  location_id?: number;
  location?: PreciseLocation;
  recipient_addr: string;
  courier_addr: string;
  box_did: string;
  trackingNumber?: string;
}

export interface ParcelData {
  _createTime: Date;

  id: number;
  trackingNumber: string;
  nftId: string;
  transactionHash: string;
  recipient_id: string;
  courier_id: string;
  box_id: string;
  location_id: number;
  depositTime: Date;
  withdrawTime: Date;
  status: ParcelStatus;
}
export enum ParcelStatus {
  ACTIVE = 5,
  DEPOSITED = 6,
  WITHDRAWN = 7,
  DELETED = 9
}

export enum RatingType {
  COURIER = 1,
  SMART_BOX = 2,
}

export interface RateTransactionDto {
  parcel_id: number;
  recipient_id: number;
  ratingType: RatingType;
  rating: number;
}

export interface RateTransactionResponse {
  parcel_id: number;
  recipient_id: number;
  author_id: number;
  ratingType: RatingType;
  rating: number;
}





import Constants from 'expo-constants';

const API_URL = Constants?.expoConfig?.extra?.API_URL || 'https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/'


// Define a custom baseQuery with a default base URL and headers
const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers: Headers, { getState }) => {
    const authToken = (getState() as RootState).secure.userData.token
    //console.log('authToken', authToken);
    if (authToken) {
      //console.log('authToken', authToken);
      headers.set('Authorization', `Bearer ${authToken}`)
    }
    headers.set('Content-Type', 'application/json')
    return headers
  },
})
// Define the RTK Query API slice
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'AuthMsg', 'Box', 'Boxes', 'Parcels'],
  //this is used to persist the data from the api in storage (redux-persist)
  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === REHYDRATE) {
      console.log('extractRehydrationInfo', action.payload?.[reducerPath]);
      return action.payload?.[reducerPath]
    }
  },
  endpoints: (builder) => ({
    // Define the endpoint for the auth message
    getAuthMsg: builder.query<WalletAuthMsg, void>({
      query: () => ({
        url: '/auth/wallet-auth-msg',
        method: 'GET',
      }),
      transformResponse: (response: WalletAuthMsg) => response,
      providesTags: ['AuthMsg'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('AuthMsg started');
        try {
          const { data } = await queryFulfilled;
          console.info('AuthMsg completed', data);
        } catch (error) {
          console.log('AuthMsg Error', JSON.stringify(error));
        }
      },
    }),
    RegisterWallet: builder.mutation<AuthResponse, RegisterWallet>({
      query: (body) => ({
        url: '/auth/register/wallet',
        method: 'POST',
        body,
      }),
      transformResponse: (response: AuthResponse) => response,
      transformErrorResponse: (response: any) => {
        console.log('/auth/register/wallet', response);
        return response
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          dispatch(setToken(data.authToken.data))
          dispatch(apiSlice.util.updateQueryData('getMe', undefined, (draft) => {
            console.log('patchResult', draft);
            Object.assign(draft, data.profile)
          })
          )
          //works if some cache is already there for the user it will update it
        } catch (error) { }
      },
      //invalidatesTags: ['User'] //no need to invalidate the user cache as it is updated manually
    }),
    LoginWallet: builder.mutation<AuthResponse, RegisterWallet>({
      query: (body) => ({
        url: '/auth/login/wallet',
        method: 'POST',
        body,
      }),
      transformResponse: (response: AuthResponse) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.info('onQueryStarted /auth/login/wallet', arg);
        try {
          const { data, meta } = await queryFulfilled;
          dispatch(setToken(data.authToken.data))
          //mannually update the user cache with the new data
          dispatch(apiSlice.util.updateQueryData('getMe', undefined, (draft) => {
            console.log('patchResult', draft);
            Object.assign(draft, data.profile)
          })
          )
          //works if some cache is already there for the user it will update it
        } catch (error) {
          //if i need loging
          //console.log('error /auth/login/wallet', JSON.stringify(error));
        }
      },
      transformErrorResponse(baseQueryReturnValue, meta, arg) {
        //using this to log the error better
        console.log('error /auth/login/wallet', baseQueryReturnValue);
        return baseQueryReturnValue
      },
      //invalidatesTags: ['User'] //no need to invalidate the user cache as it is updated manually
    }),
    getMe: builder.query<User, void>({
      query: () => ({
        url: '/users/me',
        method: 'GET',
      }),
      transformResponse: (response: User) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log(' /users/me started');
        try {
          const { data, meta } = await queryFulfilled;
          //console.log('data', data);
          //console.log(meta)
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /users/me', response);
        return response
      },

      providesTags: ['User'],
    }),

    updateMe: builder.mutation<User, UserName>({
      query: (body) => ({
        url: '/users/update',
        method: 'PUT',
        body,
      }),
      transformResponse: (response: User) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log(' /users/me started');
        try {
          const { data, meta } = await queryFulfilled;
          console.log('updated data', data);
          //console.log(meta)
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /users/me', response);
        return response
      },
      invalidatesTags: ['User'],
    }),



    getUserDetails: builder.query<User, void>({
      query: () => ({
        url: '/users/details',
        method: 'GET',
      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log(' /users/details started');
        try {
          const { data, meta } = await queryFulfilled;
          console.log('data', data);
          console.log(meta)
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /users/details', response);
        return response
      },


    }),
    //box endpoints
    getBoxes: builder.query<GetBoxesResponse, Partial<BoxQueryFilterDto> | void>({
      query: (queryParam = {}) => ({
        url: '/box',
        method: 'GET',
        params: queryParam as Record<string, any> | undefined,
      }),
      transformResponse: (response: GetBoxesResponse) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.info('onQueryStarted /box', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('getBoxes data', JSON.stringify(data));
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /box', response);
        return response;
      },
      providesTags: ['Boxes'],
    }),
    //get a box data by id
    getBox: builder.query<Box, number>({
      query: (id) => ({
        url: `/box/${id}/data`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('getBox', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('getBox data', data);
        } catch (error) { }
      },
      providesTags: (result, error, id) => [{ type: 'Box', id }],

    }),
    connectBox: builder.mutation<any, connectBox>({
      query: (body) => ({
        url: '/box/connect',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /box/connect', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('data', JSON.stringify(data));


        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /box/connect', response);
        return response
      },
      invalidatesTags: ['Boxes'],
    }),

    //updtae box by id
    updateBox: builder.mutation<Box, Partial<UpdateBoxDto>>({
      query: (body) => {
        const { id, ...rest } = body;
        console.log('calling updateBox', body);
        return {
          url: `/box/${id}/update`,
          method: 'PUT', //todo change to PATCH when the backend is ready
          body: body,
        };
      },
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('updateBox', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('data', data);
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /box/update', response);
        return response
      },
      invalidatesTags: (result, error, arg) => [{ type: 'Box', id: arg.id }, 'Boxes'],



    }),












    ///location/box/:boxId/precise

    setBoxPreciseLocation: builder.mutation<any, setBoxPreciseLocation>({
      query: (body) => {
        const { boxId, preciseLocation, update } = body;
        return {
          url: `/location/box/${boxId}/precise`,
          method: update ? 'PATCH' : 'POST',
          body: preciseLocation,
        };
      },
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('setBoxPreciseLocation /location/box/precise', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/location/box/precise fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /location/box/precise', response);
        return response
      },

      invalidatesTags: (result, error, arg) => [{ type: 'Box', id: arg.boxId }],

      //todo update the cache with the new location

    }),

    // Note that when listing boxes using box API, preciseLocation is already populated,
    //  meaning this endpoint doesn't need to be called when box is loaded initially.
    //   You should only call this endpoint when refreshing precise location for a box
    //    without refreshing the entire box.

    getBoxPreciseLocation: builder.query<PreciseLocation, number>({

      query: (id) => ({
        url: `/location/box/${id}/precise`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('getBoxPreciseLocation', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/location/box/precise fulfiled', JSON.stringify(data));
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /location/box/precise', response);
        return response
      }

    }),
    //todo doesent work error 500
    getParcelPreciseLocation: builder.query<PreciseLocation, number>({
      query: (id) => ({
        url: `/parcel/${id}/location`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('getParcelPreciseLocation', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/parcel/${id}/location fulfiled', JSON.stringify(data));
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /parcel/${id}/location', response);
        return response
      }
    }),


    getBoxAccessKey: builder.query<getBoxAccessKeyResponse, getBoxAccessKeyParams>({
      query: ({ boxId, challenge, preciseLocation }) => ({


        //https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/box/1/access-key?id=1&longitude=11&latitude=1&inaccuracy=1
        url: `/box/${boxId}/access-key?challenge=${challenge}&location%5Blatitude%5D=${preciseLocation.latitude}&location%5Blongitude%5D=${preciseLocation.longitude}&location%5Binaccuracy%5D=${preciseLocation.inaccuracy}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('getBoxAccessKey', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('getBoxAccessKey fulfilled', JSON.stringify(data));
        } catch (error) {
          console.log('getBoxAccessKey error', JSON.stringify(error));
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error getBoxAccessKey', response);
        return response
      }
    }),

    //box/id/permission GET not used deprecated
    getDoesUserHavePermissionToBox: builder.query<any, number>({
      query: (id) => ({
        url: `/box/1/permission`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('getDoesUserHavePermissionToBox', arg)
        try {
          const { data } = await queryFulfilled;
          console.log('getDoesUserHavePermissionToBox fulfilled', JSON.stringify(data));
        } catch (error) { }
      },
      transformErrorResponse: (response: any) => {
        console.log('error getDoesUserHavePermissionToBox', response);
        return response
      }
    }),










    //parcel 





    createApproximateLocation: builder.mutation<any, ApproximateLocation>({
      query: (body) => ({
        url: '/location/create',
        method: 'POST',
        body,
      }),

      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /location/create', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/location/create fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /location/create', response);
        return response
      },

    }),

    updateApproximateLocation: builder.mutation<any, ApproximateLocation>({
      query: (body) => ({
        url: '/location/update',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /location/update', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/location/update fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /location/update', response);
        return response
      },
    }),

    createParcelByWallet: builder.mutation<ParcelData, CreateParcelByWallet>({
      query: (body) => ({
        url: '/parcel/create/by-wallet',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /parcel/create/by-wallet', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/parcel/create/by-wallet fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /parcel/create/by-wallet', response);
        return response
      },
      invalidatesTags: ['Parcels']


    }),

    getParcels: builder.query<ParcelData[], Partial<ParcelQueryFilterDto> | void>({
      query: (queryParam) => ({
        url: '/parcel/',
        method: 'GET',
        params: queryParam as Record<string, any> | undefined,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /parcel/', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/parcel/ fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /parcel/', response);
        return response
      },
      transformResponse: (response: any) => {
        return response.data as ParcelData[]
      },
      providesTags: ["Parcels"]

    }),




    //TODO INVALIDATE CACHE ...
    updateParcelById: builder.mutation<ParcelData, ParcelData>({
      query: ({ id, ...body }) => ({
        url: `/parcel/update/${id}`, // interpolate id into URL
        method: 'PATCH', // use PATCH method
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log(`onQueryStarted /parcel/update/${arg.id}`, arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log(`/parcel/update/${arg.id} fulfilled`, JSON.stringify(data));
        } catch (error) {
          // added error logging
          console.log(`error /parcel/update/${arg.id} in onQueryStarted`, error);
        }
      },
      transformErrorResponse: (error: any) => {
        console.log('error /parcel/update/', error);
        // handle the error and return a custom error response
        return { error: 'An error occurred while updating the parcel by wallet.' };
      },
      invalidatesTags: ['Parcels']


    }),



    //deposit parcel  @Post('/:id/deposit')
    depositParcel: builder.mutation<any, number>({
      query: (id) => ({
        url: `/parcel/${id}/deposit`,
        method: 'POST'
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /parcel/deposit', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/parcel/deposit fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /parcel/deposit', response);
        return response
      },
      invalidatesTags: ['Parcels']

    }),

    //withdraw parcel @Post('/:id/withdraw')
    withdrawParcel: builder.mutation<any, number>({
      query: (id) => ({
        url: `/parcel/${id}/withdraw`,
        method: 'POST'
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /parcel/withdraw', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/parcel/withdraw fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /parcel/withdraw', response);
        return response
      },
      invalidatesTags: ['Parcels']
    }),


    //get parcel by id
    getParcelById: builder.query<ParcelData, number>({
      query: (id) => ({
        url: `/parcel/${id}`,
        method: 'GET',

      }),
      transformResponse: (response: any) => response,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('getParcelById', arg)
        try {
          const { data } = await queryFulfilled;
          console.log('getParcelById fulfilled', JSON.stringify(data));
        } catch (error) {
          console.log('getParcelById error', error);

          //get to object




          console.log('getParcelById error', JSON.stringify(error));
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error getParcelById', response);
        return response
      }
    }),

    //rate-transaction
    rateTransaction: builder.mutation<RateTransactionResponse, RateTransactionDto>({
      query: (body) => ({
        url: '/reputation/rate-transaction'
        , method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        console.log('onQueryStarted /rate-transaction', arg, dispatch);
        try {
          const { data } = await queryFulfilled;
          console.log('/rate-transaction fulfiled', JSON.stringify(data));
        } catch (error) {
        }
      },
      transformErrorResponse: (response: any) => {
        console.log('error /rate-transaction', response);
        return response
      }
    }),
















  }),
})

import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { BoxPermissionLevel, BoxStatus, UserType2 } from '../constants/Auth';
/**
 * Type predicate to narrow an unknown error to `FetchBaseQueryError`
 */
export function isFetchBaseQueryError(
  error: unknown
): error is FetchBaseQueryError {
  return typeof error === 'object' && error != null && 'status' in error
}
/**
 * Type predicate to narrow an unknown error to an object with a string 'message' property
 */
export function isErrorWithMessage(
  error: unknown
): error is { message: string } {
  return (
    typeof error === 'object' &&
    error != null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  )
}


export function getErrorMessage(err: any) {

  try {
    if (isFetchBaseQueryError(err)) {
      // const errMsg = 'error' in err ? err.error : "JSON.stringify(err.data)"
      let errMsg;
      if ('error' in err) {
        errMsg = err.error;
      } else if ('data' in err && typeof err.data === 'object' && err.data !== null) {
        if ('message' in err.data && typeof err.data.message === 'string') {
          errMsg = err.status + " " + err.data.message;
        } else {
          errMsg = JSON.stringify(err.data);
        }
      } else {
        errMsg = JSON.stringify(err);
      }

      return errMsg;


    } else if (isErrorWithMessage(err)) {
      return err.message
    } else {
      return JSON.stringify(err)
    }

  }
  catch (err) {
    console.log("error with message , ", err);
    return JSON.stringify(err)
  }
}





// Export the reducer and middleware separately
export const { reducer, middleware } = apiSlice
// Export the endpoint for use in components
export const { useGetAuthMsgQuery, useRegisterWalletMutation, useLoginWalletMutation, useGetMeQuery, useLazyGetAuthMsgQuery, useLazyGetMeQuery, useGetUserDetailsQuery, useLazyGetUserDetailsQuery, useCreateParcelByWalletMutation, useLazyGetDoesUserHavePermissionToBoxQuery, useLazyGetBoxPreciseLocationQuery
  , useGetBoxesQuery, useGetBoxQuery, useLazyGetBoxQuery, useLazyGetBoxesQuery, useConnectBoxMutation, useSetBoxPreciseLocationMutation, useGetBoxPreciseLocationQuery, useCreateApproximateLocationMutation, useUpdateApproximateLocationMutation, useGetBoxAccessKeyQuery, useLazyGetBoxAccessKeyQuery
  , useDepositParcelMutation, useLazyGetParcelByIdQuery, useGetParcelByIdQuery, useWithdrawParcelMutation, useRateTransactionMutation, useUpdateParcelByIdMutation, useUpdateMeMutation, useGetParcelsQuery, useUpdateBoxMutation, useLazyGetParcelPreciseLocationQuery
} = apiSlice
