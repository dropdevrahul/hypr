import {useState} from 'react';
import './App.css';
import {MakeRequest} from "../wailsjs/go/main/App";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import MenuItem from '@mui/material/MenuItem'; // Grid version 2
import Select from '@mui/material/Select'; // Grid version 2
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Experimental_CssVarsProvider as CssVarsProvider,
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});


function App() {
    const [resultText, setResultText] = useState("");
    const [reqMethod, setReqMethod] = useState("GET");
    const [errorText, setErrorText] = useState("");
    const [reqBody, setReqBody] = useState("");
    const [reqHeaders, setReqHeaders] = useState("");
    const [resultHeader, setResultHeader] = useState("");
    const [url, setURL] = useState('');
    const updateURL = (e: any) => setURL(e.target.value);
    const updateResultText = (result: any) =>  {
      setResultHeader(result.HeadersStr)
        setResultText(result.Body)
        setErrorText(result.Error)
    };

    const updateMethod = (e: any) => setReqMethod(e.target.value);
    const updateBody = (e:any) => setReqBody(e.target.value)
    const updateReqHeaders = (e:any) => setReqHeaders(e.target.value)
    function makeRequest() {
        MakeRequest(url, reqMethod, reqBody, reqHeaders).then(updateResultText);
    }
    return (
        <CssVarsProvider>
         <CssBaseline />
           <Grid container className="App">
              <Grid xs={1}>
                <Select label="Type" value={reqMethod} className="url" color="success" variant="standard" onChange={updateMethod}>
                  <MenuItem value={"GET"}>GET</MenuItem>
                  <MenuItem value={"POST"}>POST</MenuItem>
                  <MenuItem value={"PUT"}>PUT</MenuItem>
                </Select>
              </Grid>
              <Grid xs={10}>
                  <TextField id="url" className="url" variant="standard"
                    onChange={updateURL} autoComplete="off" name="url"/>
              </Grid>
              <Grid xs={1}>
                <div id="req-button-p">
                  <Button className="make-request" color="primary" variant="contained" onClick={makeRequest}>Go</Button>
                </div>
              </Grid>
              <Grid xs={4} className="req-headers-p">
                <Divider textAlign="left" className="req-header-div" color="success"><span>Request Headers</span></Divider>
                <TextField id="reqheaders" multiline className="req-headers" variant="filled" rows={10} color="success"
                  onChange={updateReqHeaders} autoComplete="off" name="reqheaders"/>
              </Grid>
              <Grid xs={8} className="req-body-p">
                <Divider textAlign="left" className="body-div" color="primary"><span>Request Body</span></Divider>
                <TextField id="url" multiline className="req-body" variant="filled" rows={10} color="primary"
                  onChange={updateBody} autoComplete="off" name="reqbody"/>
              </Grid>
              <Grid xs={4} className="headersp">
                <Divider textAlign="left" className="header-div"><span color='#82aaff'>Headers</span></Divider>
                <div id="headers" className="headers"><pre>{resultHeader}</pre></div>
              </Grid>
              <Grid xs={8} className="resultp">
                <Divider textAlign="left" className="res-div"><span color='#c3e88d'>Response</span></Divider>
                <div id="result" className="result"><pre>{resultText}</pre></div>
              </Grid>
              <Grid xs={12} className="errorp">
                <Divider textAlign="left" className="error-div" color="error">Error</Divider>
                <div id="error" className="error"><pre>{errorText}</pre></div>
              </Grid>
          </Grid>
        </CssVarsProvider>
    )
}

export default App
