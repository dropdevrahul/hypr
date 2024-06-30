import {TextField, Checkbox, FormControlLabel, Box} from "@mui/material";
import {Header} from "../lib/header";

export interface HeaderProps {
  activeReqHeader: number
  reqHeaders: Header[][]
}

export const RequestHeader = (props: HeaderProps) => {

  return (
    <>
      {
        props.reqHeaders[props.activeReqHeader].map((d: Header, index: number) =>
        <Box flex="flex" flexDirection="row">
          <Checkbox name="enabled" size="small"></Checkbox>
          <TextField margin="dense" size='small' style={{width: "30%"}}
            key={index} variant="filled" placeholder="Key" onChange={(e)=> d.Key=e.target.value}
          >{d.Key}</TextField>
          <TextField margin='dense' style={{marginLeft: "4px", width: "60%"}}
            size='small' variant='filled' placeholder="Value" onChange={(e)=> d.Value=e.target.value}>
            {d.Value}</TextField>
        </Box>)
      }
    </>
  )
}

