import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { ActivityIndicator, Avatar, Button, Subheading, Title, useTheme } from 'react-native-paper';
import { AirbnbRating } from 'react-native-ratings';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authenticate, connectDeviceById, disconnectDevice, getChallenge, keyBotCommand, subscribeToEvents } from '../../../ble/bleSlice';
import { KeyBotCommand, KeyBotState } from '../../../ble/bleSlice.contracts';
import ScreenIndicators from '../../../components/ScreenIndicators';
import StepCard from '../../../components/StepCard';
import { View } from '../../../components/Themed';
import { Box, ParcelData, PreciseLocation, RateTransactionDto, RatingType, getErrorMessage, isErrorWithMessage, useGetParcelByIdQuery, useLazyGetBoxAccessKeyQuery, useLazyGetBoxPreciseLocationQuery, useLazyGetBoxQuery, useRateTransactionMutation, useUpdateParcelByIdMutation, useWithdrawParcelMutation } from '../../../data/api';
import { CreateDatasetResponse, Metadata, UploadMetadataToIPFSResponse, callCreateDataset, callPushToSMS, callSellDataset, getNftDetails, setReputation, updateBox, uploadMetadataToIPFS } from '../../../data/blockchain';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';

export default function ConnectToTheBox() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const dispatch = useAppDispatch();
  const ble = useAppSelector((state) => state.ble);

  const [page, setPage] = useState(0);
  const { data: parcel, error, isLoading } = useGetParcelByIdQuery(parseInt(String(params.id)));
  const [getBox, { data: boxData }] = useLazyGetBoxQuery();
  const [updateParcelById, { }] = useUpdateParcelByIdMutation();
  const [withdrawParcel, { }] = useWithdrawParcelMutation();
  const [nftDetails, setNftDetails] = useState<{
    parcelId: string, sender: string, receiver: string
  } | undefined>(undefined);

  const [boxDetails, setBoxDetails] = useState<Box | undefined>(undefined);

  const [location, setLocation] = React.useState<LocationObject | null>(null);

  const [getBoxAccessKey] = useLazyGetBoxAccessKeyQuery();
  const [getBoxPreciseLocation] = useLazyGetBoxPreciseLocationQuery();

  const [rateTransaction, {
    isLoading: rateTransactionLoading,
  }] = useRateTransactionMutation();
  const [isCarUnlocked, setIsCarUnlocked] = useState(false);
  const [isBlockchainProcessing, setIsBlockchainProcessing] = useState(false);
  const [isBlockchainDone, setIsBlockchainDone] = useState(false);
  const [BlockchainTransaction, setBlockchainTransaction] = useState("");
  const [boxRating, setBoxRating] = useState(-1);
  const [courierRating, setCourierRating] = useState(-1);

  const parcelNFTSCAddress = Constants?.expoConfig?.extra?.parcelNFTSCAddress;
  const explorerUrl = Constants?.expoConfig?.extra?.explorerUrl;
  const flatListRef = React.useRef<FlatList>(null);




  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(0);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const steps = [

    "Uploading MetaData to IPFS",
    "Creating dataset",
    "Pushing to SMS",
    "Selling dataset",
    "Updating MetaData of the Box NFT",
    "Updating Parcel status"

  ];
  const pagerRef = useRef<PagerView>(null);


  useEffect(() => {
    if (flatListRef.current) {
      if (activeStep == 0) {
        return;
      }
      flatListRef.current.scrollToIndex({
        index: activeStep - 1, animated: true, viewPosition: 0,
      });
      console.log("scrolling to index", activeStep - 1);
    }
  }, [activeStep]);

  const nextStep = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  const handleError = (step: number, error: any) => {
    console.log("Error at step " + step + ": " + JSON.stringify(error, null, 2));
    setErrorStep(step);



  };





  useEffect(() => {
    if (parcel) {
      const fetchBoxDetails = async () => {
        let boxResponse = await getBox(parseInt(parcel.box_id)).unwrap();
        setBoxDetails(boxResponse);
      }
      fetchBoxDetails();
      const fetchBlockchainDetails = async () => {
        try {
          let blockchainDetails = await dispatch(getNftDetails(parcel.nftId)).unwrap();
          console.log(blockchainDetails);
          setNftDetails(blockchainDetails);
        } catch (error) {
          console.error('Failed to load box details', error);
        }
      }
      fetchBlockchainDetails();
    }
  }, [parcel, getBox]);


  //rating
  useEffect(() => {
    const rateBox = async () => {
      if (boxRating > 0 && parcel && boxData) {
        console.log("boxRating", boxRating);
        try {
          const rating_box: RateTransactionDto = {
            rating: boxRating,
            recipient_id: boxData?.id!, //for now only recipient can rate
            parcel_id: parcel.id,
            ratingType: RatingType.SMART_BOX,
          };
          await rateTransaction(rating_box).unwrap();
          console.log("rating_box success");
        } catch (error) {
          console.log(error);
        }
      }
    };

    rateBox();
  }, [boxRating]);

  useEffect(() => {
    const rateCourier = async () => {
      if (courierRating > 0 && parcel && boxData && nftDetails) {
        console.log("courierRating", courierRating);
        try {
          const rating_courier: RateTransactionDto = {
            rating: 5,
            recipient_id: parseInt(parcel.courier_id),
            parcel_id: parcel.id,
            ratingType: RatingType.COURIER,
          };
          await rateTransaction(rating_courier).unwrap();
          console.log("rating_courier success");

          //also rate on blockchain 
          const set_BC_rating = await dispatch(setReputation({ user: nftDetails.sender, score: courierRating })).unwrap();
          console.log("set_BC_rating", set_BC_rating);
        }
        catch (error) {
          console.log(error);
        }
      }
    };

    rateCourier();
  }, [courierRating]);


  useEffect(() => {

    //refetch();

    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show("You need to grant location permissions to use this feature.", {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          shadow: true,
          animation: true,
          hideOnPress: true,
          delay: 0,
          backgroundColor: theme.colors.error,
        });

        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, [])


  async function BleConnect(box: Box) {
    try {

      //0.get more details about the box
      console.log("callin getBoxDetails with id", box.id);
      // const boxDetails = await getBoxDetails(box.id).unwrap();

      // console.log("boxDetails",boxDetails);

      const preciseLocationBox = await getBoxPreciseLocation(box.id).unwrap();
      console.log("preciseLocationBox", preciseLocationBox);




      // 1. Connect to device
      const connectResult = await dispatch(connectDeviceById({ id: box.macAddress })).unwrap();
      console.log("connectResult", connectResult);

      // 2. Get the challenge
      const challenge = await dispatch(getChallenge()).unwrap();
      console.log("challenge", challenge);


      //check if location is null
      if (location == null) {
        throw new Error("Location service is not enabled please enable it");
      }


      //3. get location of the user
      console.log(location?.coords.latitude);
      console.log(location?.coords.longitude);
      console.log(location?.coords.accuracy);
      console.log(location?.timestamp);


      if (location?.coords.latitude == undefined || location?.coords.longitude == undefined || location?.coords.accuracy == undefined) {
        throw new Error("Location service is not enabled please enable it");

      }

      const preciseLocation: PreciseLocation = {
        latitude: location?.coords.latitude!,
        longitude: location?.coords.longitude!,
        inaccuracy: location?.coords.accuracy!,
      }

      //TODO REMOVE THIS HACK and use the real location



      // 3. Get solution from api 
      const response = await getBoxAccessKey({ challenge: challenge, preciseLocation: preciseLocationBox, boxId: box.id }).unwrap();



      console.log("getBoxAccessKey", response.accessKey);

      // 4. Authenticate
      const auth = await dispatch(authenticate({ solved_challenge: response.accessKey })).unwrap();
      console.log(auth);

      if (auth) {
        console.log("authenticated");

        // 5. Subscribe to events and init commands

        const events = await dispatch(subscribeToEvents()).unwrap();


      } else {
        console.log("not authenticated");
      }


    } catch (err) {
      Toast.show(getErrorMessage(err), {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        delay: 0,
        backgroundColor: theme.colors.error,

      });

    }




  }
  async function BleDisconnect() {
    let result =
      await dispatch(disconnectDevice()).unwrap().then((result) => {
        console.log(result);
        return result;
      }
      ).catch((error) => {
        if (isErrorWithMessage(error)) {
          console.log(error.message);

        }
        else {
          console.log(error);
        }

      }
      );
  }

  async function blockchain(box: Box, parcel_data: ParcelData, preciseLocation: PreciseLocation) {
    try {
      setActiveStep(0); // Start from the first step


      // Step 1: Upload metadata to IPFS



      const metadata: Metadata = {
        location: preciseLocation,
        user_id: parseInt(parcel_data.recipient_id),
        parcel_id: parcel_data.id,
        action: "Client picked up the parcel from the Vehicle",
        timestamp: Date.now().toString(),
        testingEnv: false,
      }; // Prepare metadata from parcel data


      const uploadToIPFS_Result: UploadMetadataToIPFSResponse = await dispatch(uploadMetadataToIPFS(metadata)).unwrap();


      // Step 2: Create dataset
      nextStep();

      const createDataset_Result: CreateDatasetResponse = await dispatch(callCreateDataset({
        ipfsRes: uploadToIPFS_Result.ipfsRes,
        aesKey: uploadToIPFS_Result.aesKey,
        checksum: uploadToIPFS_Result.checksum,
      })).unwrap();


      // Step 3: Push to SMS
      nextStep();

      await dispatch(callPushToSMS({
        dataset_address: createDataset_Result.datasetAddress,
        aesKey: uploadToIPFS_Result.aesKey,
      })).unwrap();


      // Step 4: Sell dataset
      nextStep();

      await dispatch(callSellDataset({
        dataset_address: createDataset_Result.datasetAddress,
        price: 0,
      })).unwrap();


      nextStep();
      // Step 5: update box NFT

      const update_box = await dispatch(updateBox({
        tokenId: parcel_data.nftId,
        dataset: createDataset_Result.datasetAddress,
        transferOwnership: false,
      })).unwrap()


      console.log("update_box", update_box);
      nextStep();


      // Step 8: update parcel status

      const withdraw = await withdrawParcel(parcel_data.id).unwrap();



      nextStep();









      // If everything is successful, reset the errorStep and show a success message
      setErrorStep(null);
      setIsBlockchainProcessing(false);
      setIsBlockchainDone(true);
      setBlockchainTransaction(update_box.txHash);


    } catch (error) {
      handleError(activeStep, error); // If there's an error, handle it
    }
  }





  const renderStepCard = ({ item, index }: { item: string; index: number }) => {
    // console.log("renderStepCard", item, index);
    // console.log("activeStep", activeStep);
    // console.log("errorStep", errorStep);

    const status = errorStep === index ? 'error' : index < activeStep ? 'completed' : 'pending';

    //errorStep
    // console.log("status", status);



    return <StepCard title={item} status={status} />;
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        entering={FadeInUp.duration(1000).springify()}
        style={{ flex: 10, }}
      >
        {boxDetails && location && parcel ? (
          <PagerView style={{
            flex: 1,

          }} initialPage={page} onPageSelected={(e) => {
            setPage(e.nativeEvent.position);
          }}
            ref={pagerRef}

          >
            <View key="0" style={styles.page}>

              {ble.connectedDevice?.id === boxDetails.macAddress
                && ble.deviceConnectionState.status === 'ready'

                ? (
                  <><Avatar.Icon size={56} icon="cube" /><><Title style={styles.title} >Connected</Title><Subheading>{ble.connectedDevice?.name}</Subheading><Subheading>{ble.connectedDevice?.id}</Subheading></></>

                ) : (
                  <>
                    <Avatar.Icon size={56} icon="cube" style={{ backgroundColor: "grey" }}

                    />
                    <Title style={styles.title}

                    >Connect to the Vehicle system (Box)</Title>
                    <Title style={styles.subtitle}>
                      To unlock the Vehicle, you need to connect to the box first.

                    </Title>

                    <Button icon="bluetooth" mode="contained" contentStyle={{ height: 80, width: 200 }}

                      onPress={() => {
                        console.log('Connecting to Box ' + boxDetails?.macAddress);
                        BleConnect(boxDetails);
                      }}>
                      {ble.deviceConnectionState.status}
                    </Button>
                  </>
                )}
              <Button mode="contained" onPress={() => BleDisconnect()} style={{ margin: 20 }} contentStyle={{ height: 60, width: 150 }}>
                disconnect
              </Button>


            </View>
            <View key="1" style={styles.page}>

              <Avatar.Icon
                size={56}
                icon="car"
                style={{
                  backgroundColor:
                    ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT
                      ? "yellow" : theme.colors.primary
                }}
              />
              <Title style={styles.title}
              >Unlock the Vehicle</Title>
              <Title
                style={styles.subtitle}
              >{ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT ?
                "Unlocking the vehicle..."
                : "Press the unlock button"


                }</Title>


              <Button
                icon=""
                mode="contained"
                contentStyle={{ height: 80, width: 200 }}
                loading={ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT}
                disabled={ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT}
                onPress={() =>
                  dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_LEFT }))
                }

              >
                Unlock
              </Button>

            </View>
            <View key="2" style={styles.page}>
              <Avatar.Icon size={56} icon="package-variant-closed" />

              <Title style={styles.title}
              >
                Retrieve Your Parcel from the Vehicle
              </Title>

              <Title style={styles.subtitle}>
                Open the Vehicle, grab your parcel, then close it securely.
              </Title>


              <Title style={styles.subtitle}>
                Tracking number:
                <Title style={{ fontWeight: "bold" }}>
                  {"\n" + parcel.trackingNumber}
                </Title>
              </Title>

              <Button mode="contained"
                icon="check"
                contentStyle={{ height: 80, width: 200 }}
                onPress={() => {


                  if (pagerRef && pagerRef.current
                  ) {
                    pagerRef.current.setPage(page + 1);
                  }


                }}>
                Done
              </Button>
            </View>
            <View key="3" style={styles.page}>
              <Avatar.Icon
                size={56}
                icon="car"
                style={{
                  backgroundColor:
                    ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT
                      ? "yellow" : theme.colors.primary
                }}
              />
              <Title style={styles.title}

              >Lock the Vehicle</Title>
              <Title
                style={styles.subtitle}
              >{ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT ?
                "Locking the Vehicle..."
                : "Press the lock button"


                }</Title>


              <Button
                icon=""
                mode="contained"
                contentStyle={{ height: 80, width: 200 }}
                loading={ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT}
                disabled={ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT}
                onPress={() =>
                  dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_RIGHT }))
                }

              >
                Lock
              </Button>


            </View>
            <View key="4" style={styles.page}>
              <View style={{
                alignItems: "center", flex: 3, justifyContent: "center"
              }}>
                <Avatar.Icon
                  size={56}
                  icon="star"
                />
                <Title style={styles.title}>Rate the Vehicle / Box</Title>
                <Title style={styles.subtitle}>
                  How was the condition of the Vehicle? Was it clean and well-maintained?
                </Title>
              </View>

              <View style={{
                flex: 1, justifyContent: "flex-end"
              }}>

                <AirbnbRating
                  size={56}
                  showRating={false}
                  onFinishRating={(rating) => {
                    setBoxRating(rating);
                    console.log("box rating", rating);
                  }}
                  reviewColor={theme.colors.primary}
                  selectedColor={theme.colors.primary}
                  defaultRating={0}

                />
              </View>
              <View style={{
                flex: 1, justifyContent: "flex-end"
              }}>
                {boxRating > 0 ? (

                  <Button mode="contained"
                    loading={rateTransactionLoading}


                    contentStyle={{ height: 80, width: 200 }}
                    onPress={() => {
                      if (rateTransactionLoading) return;

                      if (pagerRef && pagerRef.current
                      ) {
                        pagerRef.current.setPage(page + 1);
                      }


                    }}>
                    {rateTransactionLoading ? "Rating..." : "Next"}
                  </Button>
                ) : null}
              </View>

            </View>
            <View key="5" style={styles.page}>
              <View style={{
                alignItems: "center", flex: 3, justifyContent: "center"
              }}>
                <Avatar.Icon
                  size={56}
                  icon="star"
                />
                <Title style={styles.title}>Rate the Courier</Title>
                <Title style={styles.subtitle}>
                  Did the courier arrive on time? What was the condition of the parcel?
                </Title>
              </View>

              <View style={{
                flex: 1, justifyContent: "flex-end"
              }}>

                <AirbnbRating
                  size={56}
                  showRating={false}
                  onFinishRating={(rating) => {
                    setCourierRating(rating);
                    console.log("courier rating", rating);
                  }}
                  reviewColor={theme.colors.primary}
                  selectedColor={theme.colors.primary}
                  defaultRating={0}

                />
              </View>
              <View style={{
                flex: 1, justifyContent: "flex-end"
              }}>
                {courierRating > 0 ? (

                  <Button mode="contained"
                    loading={rateTransactionLoading}


                    contentStyle={{ height: 80, width: 200 }}
                    onPress={() => {
                      if (rateTransactionLoading) return;

                      if (pagerRef && pagerRef.current
                      ) {
                        pagerRef.current.setPage(page + 1);
                      }


                    }}>
                    {rateTransactionLoading ? "Rating..." : "Next"}
                  </Button>
                ) : null}
              </View>


            </View>
            <View key="6" style={styles.page_flatlist}>
              <View style={{
                flex: isBlockchainProcessing || isBlockchainDone ? 2 : 3,
                alignItems: "center", justifyContent: "center", marginTop: 10




              }}>
                <Avatar.Icon
                  size={isBlockchainProcessing || isBlockchainDone ? 48 : 56}
                  icon="account-check"
                  style={{
                    marginTop: 10,
                  }}

                />
                <Title style={isBlockchainProcessing || isBlockchainDone ? styles.titlesmall : styles.title}>
                
                  {isBlockchainProcessing
                    ? 'Uploading Parcel Withdrawal to Blockchain'
                    : isBlockchainDone
                      ? 'Parcel Withdrawal Completed'
                      : 'Confirm Parcel Withdrawal'}
                </Title>

                <Subheading
                  style={isBlockchainProcessing || isBlockchainDone ? styles.subtitle_small : styles.subtitle}
                  >
                  {isBlockchainProcessing
                    ? 'Updating NFT Metadata please wait...'
                    : isBlockchainDone
                      ? 'Parcel Withdrawal Completed'
                      : 'I have withdrawn the parcel from the Vehicle and I am ready to confirm the withdrawal.'}
                </Subheading>
              </View>

              {(isBlockchainProcessing || isBlockchainDone) ? (


                <><View style={{
                  flex: 4,
                  width: "100%",


                }}>
                  <FlatList style={{ width: "100%" }}
                    contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
                    onScrollToIndexFailed={info => {
                      console.log(info);
                    }}
                    getItemLayout={(data, index) => (
                      { length: 100, offset: 100 * index, index }
                    )}

                    ref={flatListRef}
                    data={steps}
                    renderItem={renderStepCard}
                    keyExtractor={(item, index) => index.toString()} />

                </View>
                  <View style={{
                    flex: 1,
                    flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 10
                  }}>
                    {isBlockchainDone ? (
                      <Button
                        mode="outlined"
                        onPress={() => {
                          console.log('Confirmed parcel placement in the Vehicle');
                          Linking.openURL(explorerUrl + "/tx/" + BlockchainTransaction);
                        }}
                        contentStyle={{ height: 80 }}
                        style={{
                          marginRight: 10
                          , flex: 1
                        }}>
                        View on Blockchain
                      </Button>
                    ) : null}

                    <Button
                      mode="contained"
                      loading={isBlockchainProcessing}
                      onPress={() => {
                        if (isBlockchainProcessing) return;

                        if (isBlockchainDone) {
                          router.back();

                          return;
                        }


                      }}

                      contentStyle={{
                        height: 80

                      }}
                      style={{
                        flex: 1
                      }}



                    >


                      {isBlockchainProcessing ?
                        steps[activeStep]
                        : isBlockchainDone ? 'Finish' : 'Approve'}
                    </Button>
                  </View></>

              ) : (
                <>
                  <View style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}>

                    <Button
                      mode="contained"
                      loading={isBlockchainProcessing}
                      onPress={() => {
                        if (isBlockchainProcessing) return;

                        if (isBlockchainDone) {
                          router.back();

                          return;
                        }

                        setIsBlockchainProcessing(true);
                        blockchain(
                          boxDetails,
                          parcel,
                          {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            inaccuracy: location.coords.accuracy,
                          } as PreciseLocation
                        );
                      }}

                      contentStyle={{
                        height: 80, width: 200
                      }}

                      style={{





                      }}
                    >


                      Approve
                    </Button>
                  </View>
                </>

              )}


            </View>

          </PagerView>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </Animated.View>
      <View style={{
        flex: 1

      }}>
        <Animated.View
          entering={FadeInDown.delay(200).duration(1000).springify()}
        >
          <ScreenIndicators count={7} activeIndex={page} />
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',

  },
  page_flatlist: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',



  },
  title: {
    textAlign: "center", marginBottom: 10, //bold
    fontWeight: "bold", fontSize: 22, marginTop: 20, marginHorizontal: 10
  },
  titlesmall: {
    textAlign: "center", marginBottom: 5, //bold
    fontWeight: "bold", marginTop: 10,marginHorizontal: 10
  },
  subtitle: {
    textAlign: "center", marginBottom: 40, marginHorizontal: 30
  },
  subtitle_small: {
    textAlign: "center", marginBottom: 10, marginHorizontal: 30
  },


});
