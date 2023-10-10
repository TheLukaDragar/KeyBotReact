import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';

interface PinInputProps {
  length: number;
  check?: string;
  onChange: (pin: string) => void;
  onFulfill: (pin: string) => void;
}

const PinInput = ({ length, check="", onChange, onFulfill }: PinInputProps) => {
  const [input, setInput] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>(Array(length).fill(null));

  const [toCheck , setToCheck] = useState<string[]>(Array(length).fill(''));

  useEffect(() => {
    if (check !== "") {
        setToCheck(check.split(''));
        setInput(Array(length).fill(''));

        //delay focus to next input field
        setTimeout(() => {



        inputRefs.current[0]?.focus();
        }, 100);
        
      }
    }, [check]);




  const handleChange = (index: number, value: string) => {
    const newInput = [...input];

    console.log("value",value);

    //check if value is number from 0-9
    if (isNaN(parseInt(value)) && value !== '' ) {
        return;
    }
    

    // Move focus to next input field
    if (value !== '' && index < length - 1 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
  
      }

    newInput[index] = value;
    setInput(newInput);
    onChange(newInput.join(''));
    // console.log("new",newInput.join(''));

    //check if input is complete
    if (newInput.join('') !== '' && newInput.join('').length === length && check !== "") {
        onFulfill(newInput.join(''));
        //remove focus from pin input if match
        if (check == newInput.join('')) {
            inputRefs.current[length - 1]?.blur();
        }
    }


    
    


  };

  const handleKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === 'Backspace') {
        const newInput = [...input];
        //const index = newInput.findIndex((value) => value === '');

        // find the focused input
        const focusedIndex = inputRefs.current.findIndex(
            (ref) => ref?.isFocused() === true
        );

        const index = focusedIndex;



        if (index > 0) {
            inputRefs.current[index - 1]?.focus();
            newInput[index] = '';
            setInput(newInput);
            onChange(newInput.join(''));
            
        }

      
    }
    if (nativeEvent.key === 'Enter') {
        //check if input is complete
        if (input.join('') !== '' && input.join('').length === length) {
            onFulfill(input.join(''));
        }
    }

    //check if this input has value

    //check if key is number

    if(nativeEvent.key == '0' || nativeEvent.key == '1' || nativeEvent.key == '2' || nativeEvent.key == '3' || nativeEvent.key == '4' || nativeEvent.key == '5' || nativeEvent.key == '6' || nativeEvent.key == '7' || nativeEvent.key == '8' || nativeEvent.key == '9'){
        //get index of focused input
        const focusedIndex = inputRefs.current.findIndex(
            (ref) => ref?.isFocused() === true
        );

        console.log("focusedIndex",focusedIndex);

        //check if input is empty
        if (input[focusedIndex] != '') {
            //handleChange(focusedIndex, nativeEvent.key);
            //set this input to key
            handleChange(focusedIndex, nativeEvent.key);
            

        }
    }

    

    console.log("key",nativeEvent.key);
    
  };

  const inputs = [];
  for (let i = 0; i < length; i++) {
    inputs.push(
      <PaperTextInput
      dense = {true}
        key={i}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={1}
        value={input[i]}
        onChangeText={(value) => handleChange(i, value)}
        onKeyPress={handleKeyPress}
        onSubmitEditing={() => { handleKeyPress({nativeEvent: {key: 'Enter'}})}}
        onFocus={() => { console.log( inputRefs.current[i]?.isFocused())}}


        ref={(ref: TextInput) => (inputRefs.current[i] = ref)}
        mode="outlined"
        

        //if check is not empty, compare input with check
        //underlineColor = {check !== "" ? toCheck[i] === input[i] && toCheck[i] !== '' &&  input[i] !== '' ? "green" : "red" : ""}
    
      />
    );
  }

  return <View style={styles.container}>{inputs}</View>;
};

const styles = StyleSheet.create({
  container: {
    
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin : 20,
  },
  input: {
    borderRadius: 4,
    padding: 16,
    fontSize: 24,
    width: 80,
    textAlign: 'center',
    //marginHorizontal: 4,
  },
});

export default PinInput;
