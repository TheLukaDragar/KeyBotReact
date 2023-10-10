import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { ActivityIndicator, Avatar, Button, Subheading, Title, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authenticate, connectDeviceById, disconnectDevice, getChallenge, keyBotCommand, subscribeToEvents } from '../../../ble/bleSlice';
import { KeyBotCommand, KeyBotState } from '../../../ble/bleSlice.contracts';
import ScreenIndicators from '../../../components/ScreenIndicators';
import StepCard from '../../../components/StepCard';
import { View } from '../../../components/Themed';
import { Box, ParcelData, PreciseLocation, getErrorMessage, isErrorWithMessage, useDepositParcelMutation, useGetParcelByIdQuery, useLazyGetBoxAccessKeyQuery, useLazyGetBoxPreciseLocationQuery, useLazyGetBoxQuery, useUpdateParcelByIdMutation } from '../../../data/api';
import { ApproveTransfer, ApproveTransferResponse, CreateDatasetResponse, Metadata, UploadMetadataToIPFSResponse, approveTransfer, callCreateDataset, callPushToSMS, callSellDataset, updateBox, uploadMetadataToIPFS } from '../../../data/blockchain';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';
import { getLocation } from '../../../utils/getlocation';

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
  const [depositParcel, { }] = useDepositParcelMutation();

  const [boxDetails, setBoxDetails] = useState<Box | undefined>(undefined);

  const [location, setLocation] = React.useState<LocationObject | null>(null);

  const [getBoxAccessKey] = useLazyGetBoxAccessKeyQuery();
  const [getBoxPreciseLocation] = useLazyGetBoxPreciseLocationQuery();
  const [isCarUnlocked, setIsCarUnlocked] = useState(false);
  const [isBlockchainProcessing, setIsBlockchainProcessing] = useState(false);
  const [isBlockchainDone, setIsBlockchainDone] = useState(false);
  const [BlockchainTransaction, setBlockchainTransaction] = useState("");

  const parcelNFTSCAddress = Constants?.expoConfig?.extra?.parcelNFTSCAddress;
  const explorerUrl = Constants?.expoConfig?.extra?.explorerUrl;
  const flatListRef = React.useRef<FlatList>(null);




  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(0);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const steps = [
    "Approving transfer of Box NFT",
    "Uploading MetaData to IPFS",
    "Creating dataset",
    "Pushing to SMS",
    "Selling dataset",
    "Updating MetaData of the Box NFT",
    "Transfering Box NFT",
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
    }
  }, [parcel, getBox]);


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

      let location = await getLocation()
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

      // Step 1: Approve transfer of NFT

      const approve: ApproveTransfer = {
        tokenId: parcel_data.nftId,
        to: parcelNFTSCAddress,
      };



      const approveTransfer_Result: ApproveTransferResponse = await dispatch(approveTransfer(approve)).unwrap();
      console.log("approveTransfer_Result", JSON.stringify(approveTransfer_Result, null, 2));

      // Step 2: Upload metadata to IPFS
      nextStep();


      const metadata: Metadata = {
        location: preciseLocation,
        user_id: parseInt(parcel_data.courier_id),
        parcel_id: parcel_data.id,
        action: "Courier deposited parcel in the Vehicle",
        timestamp: Date.now().toString(),
        testingEnv: false,
      }; // Prepare metadata from parcel data


      const uploadToIPFS_Result: UploadMetadataToIPFSResponse = await dispatch(uploadMetadataToIPFS(metadata)).unwrap();


      // Step 3: Create dataset
      nextStep();

      const createDataset_Result: CreateDatasetResponse = await dispatch(callCreateDataset({
        ipfsRes: uploadToIPFS_Result.ipfsRes,
        aesKey: uploadToIPFS_Result.aesKey,
        checksum: uploadToIPFS_Result.checksum,
      })).unwrap();


      // Step 4: Push to SMS
      nextStep();

      await dispatch(callPushToSMS({
        dataset_address: createDataset_Result.datasetAddress,
        aesKey: uploadToIPFS_Result.aesKey,
      })).unwrap();


      // Step 5: Sell dataset
      nextStep();

      await dispatch(callSellDataset({
        dataset_address: createDataset_Result.datasetAddress,
        price: 0,
      })).unwrap();

      // Step 6: update box NFT
      nextStep();

      //add metadata dataset to the nft and transfer nft to the receiver
      const update_box = await dispatch(updateBox({
        tokenId: parcel_data.nftId,
        dataset: createDataset_Result.datasetAddress,
        transferOwnership: true,
      })).unwrap()
      nextStep();
      console.log("update_box", update_box);

      // Step 7: transfer NFT to receiver


      await new Promise(resolve => setTimeout(resolve, 500));
      //already done in the previous step
      nextStep();

      // Step 8: update parcel status
      //const update_parcel = await updateParcelById({ id:parcel_data.id, status: ParcelStatus.DEPOSITED }).unwrap();

      const deposit = await depositParcel(parcel_data.id).unwrap();



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
                "Unlocking the Vehicle..."
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
              >Place the Parcel in the Vehicle</Title>
              <Title style={styles.subtitle}
              >
                Open the Vehicle, ensure space, place the parcel securely, and close the Vehicle door or trunk.

              </Title>
              <Button mode="contained"
                icon="check"
                contentStyle={{ height: 80, width: 200 }}
                onPress={() => {
                  console.log('Confirmed parcel placement in the Vehicle')

                  if (pagerRef && pagerRef.current
                  ) {
                    pagerRef.current.setPage(page + 1);
                  }


                }}>
                OK
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
            <View key="4" style={styles.page_flatlist}>
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
                    ? 'Processing transfer of NFT Ownership...'
                    : isBlockchainDone
                      ? 'Transfer Complete!'
                      : 'Transfer NFT Ownership and update MetaData'}
                </Title>

                <Subheading
                  style={isBlockchainProcessing || isBlockchainDone ? styles.subtitle_small : styles.subtitle}
                >
                  {isBlockchainProcessing
                    ? 'Your transfer is currently being processed. Please wait.'
                    : isBlockchainDone
                      ? 'The transfer has been successfully completed.'
                      : 'I have delivered the parcel to the Vehicle and I am ready to transfer the ownership of the NFT to the Vehicle owner.'}
                </Subheading>
              </View>
              {(isBlockchainProcessing || isBlockchainDone) ? (


                <><View style={{
                  flex: 3,
                  width: "100%",
                }}>
                  <FlatList style={{ width: "100%" }}
                    onScrollToIndexFailed={info => {
                      console.log(info);
                    }}
                    getItemLayout={(data, index) => (
                      { length: 100, offset: 100 * index, index }
                    )}
                    contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}


                    ref={flatListRef}
                    data={steps}
                    renderItem={renderStepCard}
                    keyExtractor={(item, index) => index.toString()} />

                </View>
                  <View style={{
                    flex: 1,
                    flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 20
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

                          flex: 1
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
          <ScreenIndicators count={5} activeIndex={page} />
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
    fontWeight: "bold", fontSize: 22, marginTop: 20
  },
  titlesmall: {
    textAlign: "center", marginBottom: 0, //bold
    fontWeight: "bold", marginTop: 0
  },
  subtitle: {
    textAlign: "center", marginBottom: 40, marginHorizontal: 30
  },
  subtitle_small: {
    textAlign: "center", marginBottom: 10, marginHorizontal: 30
  },



});
