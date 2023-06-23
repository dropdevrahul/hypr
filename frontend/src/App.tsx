import {useState} from 'react';
import './App.css';
import {MakeRequest, RunCurl, Export} from "../wailsjs/go/main/App";
import {main} from "../wailsjs/go/models";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import MenuItem from '@mui/material/MenuItem';
import Modal from '@mui/material/Modal'; 
import Select from '@mui/material/Select'; 
import Box from '@mui/material/Box'; 
import Typography from '@mui/material/Typography'; 
import SaveIcon from '@mui/icons-material/Save';
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

class Request {
    Method: string;
    URL: string;
    Headers: string;
    Body: string;

    constructor(source: any = {}) {
        if ('string' === typeof source) source = JSON.parse(source);
        this.Method = source["Method"];
        this.URL = source["URL"];
        this.Headers = source["Headers"];
        this.Body = source["Body"];
    }
}


function App() {
    const [request, setRequest] = useState(new Request({"Method": "GET"}))
    const [result, setResult] = useState(new main.RequestResult)
    const [curlBody, setCurlBody] = useState("");
    const [open, setOpen] = useState(false);


    const handleRequestChange = (e: any) => {
      const { name, value } = e.target;
      setRequest(prevState => ({
          ...prevState,
          [name]: value
      }));
    };

    const handleResultChange = (e: any) => {
      const { name, value } = e.target;
      setResult(prevState => ({
          ...prevState,
          [name]: value
      }));
    };

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const style = {
        position: 'absolute' as 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 800,
        bgcolor: 'background.paper',
        p: 4,
    };

    const updateCurlBody = (e:any) => setCurlBody(e.target.value)
    function makeRequest() {
        console.log(request)
        MakeRequest(request.URL, request.Method, request.Body, request.Headers).then(setResult);
    }

    function importCurl() {
      RunCurl(curlBody).then((result: any)=>{
        let req = new Request({
          "Method": result.Method,
          "URL": result.URL,
          "Body": result.RequestBody,
          "Headers": result.ReqHeaders,
        })
        setRequest(req)
        setResult(result)
        setOpen(false)
      })
    }

    function handleExport() {
      Export(result)
    }
    return (
        <CssVarsProvider>
         <CssBaseline />
         <Modal
         open={open}
         onClose={handleClose}
         aria-labelledby="modal-modal-title"
         aria-describedby="modal-modal-description"
         >
         <Box sx={style}>
         <Typography id="modal-modal-title" variant="h6" component="h2">
           Enter Curl
         </Typography>
         <Typography id="modal-modal-description" sx={{ mt: 2, width:"100%" }}>
              <TextField id="reqheaders" multiline rows={10} color="primary" sx={{width:"100%"}}
                onChange={updateCurlBody} autoComplete="off" name="curl"/>
         </Typography>
         <Typography id="modal-modal-menu" sx={{ mt: 2, width:"100%" }}>
               <Button onClick={importCurl} variant="outlined">Curl</Button>
         </Typography>
         </Box>
         </Modal>
           <Grid container className="App">
              <Grid xs={1}>
               <Button onClick={handleExport} variant="outlined"><SaveIcon></SaveIcon></Button>
              </Grid>
              <Grid xs={1}>
               <Button onClick={handleOpen} variant="outlined">Curl</Button>
              </Grid>
              <Grid xs={1}>
                <Select label="Type" value={request.Method} color="success" name="Method"
                  variant="standard" onChange={handleRequestChange}> 
                  <MenuItem value={"GET"}>GET</MenuItem>
                  <MenuItem value={"POST"}>POST</MenuItem>
                  <MenuItem value={"PUT"}>PUT</MenuItem>
                </Select>
              </Grid>
              <Grid xs={8}>
                  <TextField id="url" className="url" variant="standard" value={request.URL}
                    onChange={handleRequestChange} autoComplete="off" name="URL"/>
              </Grid>
              <Grid xs={1}>
                <div id="req-button-p">
                  <Button className="make-request" color="primary" variant="contained" onClick={makeRequest}>Go</Button>
                </div>
              </Grid>
              <Grid xs={4} className="req-headers-p">
                <Divider textAlign="left" className="req-header-div" color="success"><span>Request Headers</span></Divider>
                <TextField id="reqheaders" multiline className="req-headers" variant="filled" rows={10} color="success"
                  value={request.Headers} onChange={handleResultChange} autoComplete="off" name="Headers"/>
              </Grid>
              <Grid xs={8} className="req-body-p">
                <Divider textAlign="left" className="body-div" color="primary"><span>Request Body</span></Divider>
                <TextField id="url" multiline className="req-body" variant="filled" rows={10} color="primary"
                  onChange={handleResultChange} value={result.RequestBody} autoComplete="off" name="RequestBody"/>
              </Grid>
              <Grid xs={4} className="headersp">
                <Divider textAlign="left" className="header-div"><span color='#82aaff'>Headers</span></Divider>
                <div id="headers" className="headers"><pre>{result.HeadersStr}</pre></div>
              </Grid>
              <Grid xs={8} className="resultp">
                <Divider textAlign="left" className="res-div"><span color='#c3e88d'>Response</span></Divider>
                <div id="result" className="result"><pre>{result.Body}</pre></div>
              </Grid>
              <Grid xs={12} className="errorp">
                <Divider textAlign="left" className="error-div" color="error">Error</Divider>
                <div id="error" className="error"><pre>{result.Error}</pre></div>
              </Grid>
          </Grid>
        </CssVarsProvider>
    )
}

export default App
