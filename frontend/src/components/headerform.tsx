import {TextField, Checkbox, FormControlLabel, Box} from "@mui/material";
import {useState} from "react";
import {Header} from "../lib/header";

export interface HeaderProps {
  header: Header
  update: (h: Header) => void
}

export const RequestHeader = (props: HeaderProps) => {
  console.log(props.header)
  return (
        <Box flex="flex" flexDirection="row">
          <Checkbox name="enabled" size="small"></Checkbox>
          <TextField margin="dense" size='small' style={{width: "30%"}}
            variant="filled" placeholder="Key" onBlur={(e)=> {
              props.header.Key=e.target.value
              props.update(props.header)
            }} value={props.header.Key}
          ></TextField>
          <TextField margin='dense' style={{marginLeft: "4px", width: "60%"}}
            size='small' variant='filled' placeholder="Value" onBlur={(e)=> {
              props.header.Value=e.target.value
              props.update(props.header)
            }}
            value={props.header.Value}
            >
            </TextField>
        </Box>
  )
}

