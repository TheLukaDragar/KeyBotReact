import { FlatList, StyleSheet } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, Button, Caption, Card, Paragraph, Snackbar, Subheading, Title, useTheme } from 'react-native-paper';
import { View } from '../../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';

import React, { useEffect, useState } from 'react';
import { BoxItem, CreateParcelByWallet, ParcelData, PreciseLocation, User, getErrorMessage, useCreateParcelByWalletMutation, useGetBoxesQuery, useGetMeQuery, useUpdateParcelByIdMutation } from '../../../data/api';

import '@ethersproject/shims';
import * as Location from 'expo-location';
import Toast from 'react-native-root-toast';
import StepCard from '../../../components/StepCard';
import { BoxStatus } from '../../../constants/Auth';
import { CreateDatasetResponse, Metadata, MintBox, MintBoxResponse, UploadMetadataToIPFSResponse, callCreateDataset, callPushToSMS, callSellDataset, mintBox, uploadMetadataToIPFS } from '../../../data/blockchain';
import { getLocation } from '../../../utils/getlocation';



export default function NewParcel() {



  const router = useRouter();

  const params = useLocalSearchParams();
  //console.log("params: " + JSON.stringify(params, null, 2));

  // id: item.id,
  // sender: item.sender,
  // receiver: item.receiver,
  // address: item.address,
  // location: item.location,



  const secure = useAppSelector((state) => state.secure);
  const blockchain = useAppSelector((state) => state.blockchain);
  const dispatch = useAppDispatch();

  const { data: boxes, error, isLoading, isFetching, isError, refetch

  } = useGetBoxesQuery({

    // orderBy:"id", //todo
    // desc: true,
    availableForDeposit: true,
    boxStatus: BoxStatus.READY,



  }
    , {
      refetchOnMountOrArgChange: true,
      skip: false,
    }
  );

  //useCreateParcelByWalletMutation()

  const [createParcelByWallet, { data: parcel, error: parcelError, isLoading: parcelIsLoading, isError: parcelIsError }] = useCreateParcelByWalletMutation();

  //useUpdateParcelByIdMutation()

  const [updateParcelById, { data: parcelUpdate, error: parcelUpdateError, isLoading: parcelUpdateIsLoading, isError: parcelUpdateIsError }] = useUpdateParcelByIdMutation();


  //console.log(JSON.stringify(boxes));

  const { data: courier } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: false,
  });

  const [value, setValue] = React.useState('');
  const [selectedItemId, setSelectedItemId] = React.useState(null);

  const theme = useTheme();
  const [location, setLocation] = React.useState<PreciseLocation | null>(null);



  const [activeStep, setActiveStep] = useState(0);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const [isSnackbarVisible, setIsSnackbarVisible] = useState(false);
  const [snackBarText, setSnackBarText] = useState("");
  const [isParcelProcessing, setIsParcelProcessing] = useState(false);
  const [isParcelCreated, setIsParcelCreated] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);


  // const [receiverReputation, setReceiverReputation] = useState(-1);

  useEffect(() => {
    //SCROLL FLATLIST TO THE SELECTED ITEM
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: activeStep - 1, animated: true, viewPosition: 0.5 });
    }
  }, [activeStep]);

  const steps = [
    "Creating parcel",
    "Uploading metadata to IPFS",
    "Creating dataset",
    "Pushing to SMS",
    "Selling dataset",
    "Minting NFT",
    "Updating parcel",
  ];

  const nextStep = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleError = (step: number, error: any) => {
    console.log("Error at step " + step + ": " + JSON.stringify(error, null, 2));
    setErrorStep(step);
    setSnackBarText(getErrorMessage(error));
    setIsSnackbarVisible(true);
    setIsParcelCreated(false);


  };
  async function createParcel(box: BoxItem, courier: User, receiverAddress: string, preciseLocation: PreciseLocation, trackingNumber: string) {
    try {
      setActiveStep(0); // Start from the first step

      // Step 1: Create a new parcel
      // nextStep();
      const new_parcel: CreateParcelByWallet = {
        nftId: "not set",
        transactionHash: "not set",
        recipient_addr: receiverAddress,
        courier_addr: courier.crypto[0].wallet,
        box_did: box.did,
        location: preciseLocation,
        trackingNumber: trackingNumber,
      };

      console.log(JSON.stringify(new_parcel, null, 2
      ))

      const parcel: ParcelData = await createParcelByWallet(new_parcel).unwrap();

      // Step 2: Upload metadata to IPFS
      nextStep();


      const metadata: Metadata = {
        location: preciseLocation,
        user_id: courier.id,
        parcel_id: parcel.id,
        action: "Courier picked up the parcel",
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


      // Step 6: Mint NFT
      nextStep();

      const args: MintBox = { //Parcel
        reciever_address: receiverAddress,
        dataset: createDataset_Result.datasetAddress,
        parcel_id: parcel.id.toString(),
      }

      const mintBox_Result: MintBoxResponse = await dispatch(mintBox(args)).unwrap();

      // Step 7: Update parcel with NFT ID and transaction hash
      nextStep();
      const new_parcel2 = {
        ...parcel,
        nftId: mintBox_Result.tokenId,
        transactionHash: mintBox_Result.txHash,



      }

      console.log("new_parcel2: " + JSON.stringify(new_parcel2, null, 2));

      const updateNFTIDResponse = await updateParcelById(new_parcel2).unwrap();

      nextStep();
      // If everything is successful, reset the errorStep and show a success message
      setErrorStep(null);
      setIsParcelCreated(true);
      setIsParcelProcessing(false);

    } catch (error) {
      handleError(activeStep, error); // If there's an error, handle it
    }
  }




  useEffect(() => {
    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show('Permission to access location was denied', {
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

      let location = await getLocation();
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        inaccuracy: location.coords.accuracy || 0,
      }
      );

    })();
  }, []);

  // useEffect(() => {
  //   if(params.receiver_address) { // Check if receiver address is defined
  //     dispatch(getReputation(String(params.receiver_address)))
  //     .unwrap()
  //     .then((reputationResult) => {
  //       console.log("Reputation result: ", reputationResult);
  //       setReceiverReputation(reputationResult);
  //     })
  //     .catch((error) => {
  //       console.error("Error retrieving receiver's reputation: ", error);
  //       setReceiverReputation(-2)

  //     }

  //     );
  //   }
  // }, [dispatch, params.receiver_address]); 

  function distance(loc1: PreciseLocation, loc2: PreciseLocation) {
    const R = 6371e3; // metres
    const φ1 = loc1.latitude * Math.PI / 180; // φ, λ in radians
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres



    return d;
  }

  const renderStepCard = ({ item, index }: { item: string; index: number }) => {
    const status = index < activeStep ? 'completed' : index === activeStep ? 'pending' : errorStep === index ? 'error' : "pending";

    //errorStep



    return <StepCard title={item} status={status} />;
  };


  const renderItem = ({ item }: any) => {
    // check if courier reputation is enough to deliver the box
    // const canDeliver = courier ? courier.reputation : 0 >= item.reputationThreshold ? true : false;
    const canDeliver = true;
    let distance_to_parcel = "pending"
    const to_deliver_location = JSON.parse(params.location as string) as PreciseLocation;
    if (to_deliver_location && item.preciseLocation) {
      //round to km and 0 decimal places
      console.log("to_deliver_location: " + JSON.stringify(to_deliver_location, null, 2));
      console.log("item.preciseLocation: " + JSON.stringify(item.preciseLocation, null, 2));
      distance_to_parcel = Math.round(distance(to_deliver_location, item.preciseLocation) / 1000).toFixed(0) + " km";




    }



    return (
      <Card key={item.id} disabled={!canDeliver}

        style={selectedItemId === item.id ? styles.selectedCard : styles.card} onPress={() => {
          console.log(`Card ${item.id} pressed`);
          setSelectedItemId(selectedItemId === item.id ? null : item.id);

        }}>
        <Card.Content>

          <View style={styles.titleRow}>
            <Avatar.Icon icon="cube" size={46}
              style={{ backgroundColor: selectedItemId === item.id ? theme.colors.primary : 'grey' }}
            />
            <Title style={styles.cardTitle}>{item.did}</Title>
          </View>

          <Paragraph>Reputation: {item.reputation}</Paragraph>
          <Paragraph>Reputation threshold: {item.reputationThreshold ? item.reputationThreshold : "not set"}</Paragraph>

          <Paragraph>Vehicle licence plate: {item.licensePlate}</Paragraph>
          {/* <Paragraph>Location: {item.preciseLocation_id}</Paragraph> */}
        </Card.Content>
        <Card.Actions>
          <Caption style={styles.details}>
            {canDeliver ?
              `Distance: ${distance_to_parcel}`

              : "Reputation too low"}
          </Caption>

        </Card.Actions>

      </Card>
    );
  }

  //boxes?.items.sort((boxA, boxB) => distance(boxA.loc, boxB.preciseLocation));

  // if(boxes && boxes.items.length > 0){
  //   //sort by reputation
  //   boxes.items.sort((boxA, boxB) => (boxB.reputation || 0) - (boxA.reputation || 0));
  // }



  return (
    <View style={styles.container}>
      <Card style={{
        borderRadius: 0,

      }
      }
      >
        <Card.Content>
          <View style={styles.titleRow}>
            <Avatar.Icon icon="package-variant-closed" size={46} />
            <Title style={styles.cardTitle}>{params.title}</Title>
          </View>
          <Title style={styles.details}>Sender: <Caption style={styles.details}>{params.sender}</Caption></Title>
          <Title style={styles.details}>Receiver: <Caption style={styles.details}>{params.receiver}</Caption></Title>
          {/* <Title style={styles.details}>Receiver reputation: <Caption style={styles.details}>{
            receiverReputation == -1 ? "pending" : receiverReputation == -2 ? "not found" : receiverReputation


          }</Caption></Title> */}
          <Title style={styles.details}>Address: <Caption style={styles.details}>{params.address}</Caption></Title>
          <Title style={styles.details}>Receiver Address:  <Caption style={styles.details}>{params.receiver_address}</Caption></Title>


        </Card.Content>



      </Card>

      {isParcelProcessing || isParcelCreated
        ? (

          null

        ) : (

          <View style={{
            padding: 10,

          }}>

            <Title style={styles.title}>
              <View style={styles.infoRow}>
                {/* <Avatar.Icon icon="arrow-right" size={40}  style={{ backgroundColor: theme.colors.primary }}/> */}


                <Subheading style={styles.infoText}>
                  Deliver point: {boxes?.items.find(box => box.id === selectedItemId)?.did}
                </Subheading>

              </View>
            </Title>
            {/* <Title style={styles.title}>
        <View style={styles.infoRow}>

          <Subheading>at: </Subheading>
          <Subheading style={styles.infoText}>
            {boxes?.items.find(box => box.id === selectedItemId)?.preciseLocation_id} referferferferferf
          </Subheading>
        </View>
      </Title> */}

          </View>


        )}


      {(isParcelProcessing || isParcelCreated) ? (

        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={renderStepCard}
          keyExtractor={(item, index) => index.toString()}

        />

      ) : (
        <FlatList
          data={boxes?.items}
          renderItem={renderItem}
          keyExtractor={(item, index) => String(item.id) + index}
        />
      )}
      <Button
        icon="check"
        style={styles.button}
        contentStyle={{
          height: 60
        }}
        mode="contained"
        disabled={selectedItemId === null || !location || !params.receiver_address || !courier

        }
        loading={isParcelProcessing && !isParcelCreated}
        onPress={async () => {

          if (isParcelCreated) {

            router.back();
            return;
          }
          if (isParcelProcessing) {
            console.log('Parcel is being processed');
            return;
          }

          setIsParcelProcessing(true); // start the parcel process, switch the view


          if (!courier || !selectedItemId || !location || !params.receiver_address) {
            console.error('Required fields are missing');
            return;
          }

          const selectedBox = boxes?.items.find(box => box.id === selectedItemId);

          if (!selectedBox) {
            console.error('Selected box not found');
            return;
          }

          await createParcel(selectedBox, courier, String(params.receiver_address), location, String(params.trackingNumber));
        }}>
        {isParcelProcessing ? steps[activeStep] : isParcelCreated ? 'Parcel created' : 'Deliver'}
      </Button>
      <Snackbar
        visible={isSnackbarVisible}
        onDismiss={() => { setSnackBarText(""); setIsSnackbarVisible(false); }}
        action={{
          label: 'Ok',
          onPress: () => {
            console.log('snackbar dismissed');
            // Do something



          },
        }}>
        {snackBarText}
      </Snackbar>

    </View>
  );









}

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  card: {
    marginBottom: 10,
    marginHorizontal: 10,

    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 20,
    marginLeft: 10, // To provide some spacing between the icon and the title
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center', // This aligns the icon and the title vertically
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  details: {
    fontSize: 14,
  },
  button: {
    margin: 8,


  },
  title: {

    backgroundColor: 'transparent',
  },
  selectedCard: {
    marginBottom: 10,
    borderRadius: 5,
    marginHorizontal: 10,

  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  infoText: {
    fontSize: 18, // Increased font size



    backgroundColor: 'transparent',
  },


});
