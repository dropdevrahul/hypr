import {useState} from 'react';
import './App.css';
import {MakeRequest, RunCurl, Export} from "../wailsjs/go/main/App";
import {main} from "../wailsjs/go/models";
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import MenuItem from '@mui/material/MenuItem';
import Modal from '@mui/material/Modal'; 
import InputLabel from '@mui/material/InputLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select'; 
import Box from '@mui/material/Box'; 
import Typography from '@mui/material/Typography'; 
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Experimental_CssVarsProvider as CssVarsProvider,
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {Margin} from '@mui/icons-material';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';

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
    const [value, setValue] = useState('one');
    const [reqBodies, setReqBodies] = useState([""])
    const [reqHeaders, setReqHeaders] = useState([""])
    const [responses, setResponses] = useState([new main.RequestResult])
    const [activeReqBody, setActiveReqBody] = useState(0)
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

    const updateActiveReqTab = (e:any) => {
      setActiveReqBody(e.target.value)
    }

    const addReqBody = (e:any) => {
      reqBodies.push(reqBodies[activeReqBody])
      reqHeaders.push(reqHeaders[activeReqBody])
      responses.push(responses[activeReqBody])
      setReqBodies([...reqBodies]) 
      setResponses([...responses])
      setReqHeaders([...reqHeaders])
    }

    const updateReqBody = (e: any) => {
      reqBodies[activeReqBody] = e.target.value
      setReqBodies([...reqBodies]) 
    }

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
        MakeRequest(request.URL, request.Method,
          reqBodies[activeReqBody],
          reqHeaders[activeReqBody]).then((r: main.RequestResult) => {
            setResult(r)
            responses[activeReqBody] = r
          });
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

    const darkTheme = createTheme({
      palette: {
        mode: 'dark',
      },
    });

    return (
        <ThemeProvider theme={darkTheme}>
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
          <Box>
           <Grid container spacing={1} sx={{m:0}}>
              <Grid xs={12} sm={12} md={10} lg={11} sx={{marginTop: "1em"}}>
                <FormControl sx={{width: "10%", verticalAlign:"bottom"}} size="small" variant='standard'>
                  <Select label="Method" value={request.Method}
                    color="success" name="Method"
                    onChange={handleRequestChange} autoWidth size="small">  
                    <MenuItem value={"GET"}>GET</MenuItem>
                    <MenuItem value={"POST"}>POST</MenuItem>
                    <MenuItem value={"PUT"}>PUT</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{width: "85%", verticalAlign:"bottom"}} size="small">
                  <TextField id="url" variant="standard" value={request.URL} size="small" fullWidth
                    onChange={handleRequestChange} autoComplete="off" name="URL"/>
                </FormControl>

                <FormControl sx={{width: "5%",verticalAlign:"bottom"}} size="small">
                  <Button className="make-request" variant="contained" onClick={makeRequest} size="small">Go</Button>
                </FormControl>
              </Grid>
              <Grid xs={2} sm={2} md={2} lg={1} sx={{marginTop: "1em"}}>
                <FormControl sx={{verticalAlign:"bottom", width: "100%"}}>
                  <ButtonGroup size="small" style={{marginLeft: "auto"}}>
                   <Button onClick={handleExport} variant="outlined"><SaveIcon></SaveIcon></Button>
                   <Button onClick={handleOpen} variant="contained" color="secondary"> Curl</Button>
                  </ButtonGroup>
                </FormControl>
              </Grid>
            </Grid>

           <Grid container spacing={1} className="headers" sx={{marginTop: 0.5}}>
                <Grid xs={4}>
                    <FormLabel>Request Header</FormLabel>
                    <ButtonGroup sx={{margin: "0 5px"}}>
                      { 
                        reqHeaders.map( (d, index) => <Button
                          key={index} style={{padding: "0em", minWidth: "2rem"}}
                          variant="contained" value={index} color="success" onClick={updateActiveReqTab}
                          >{index+1}</Button>)
                      }
                      <Button color="success" sx={{minWidth: "2rem", padding: "0em"}} onClick={addReqBody}><AddIcon/></Button>
                    </ButtonGroup>
                </Grid>
                <Grid xs={8}>
                    <FormLabel>Request Body</FormLabel>
                    <ButtonGroup sx={{margin: "0 5px"}}>
                      { 
                        reqBodies.map( (d, index) => <Button
                          key={index} style={{padding: "0em", minWidth: "2rem"}}
                          variant="contained" value={index} color="success" onClick={updateActiveReqTab}
                          >{index+1}</Button>)
                      }
                      <Button color="success" sx={{minWidth: "2rem", padding: "0em"}} onClick={addReqBody}><AddIcon/></Button>
                    </ButtonGroup>
                </Grid>
            </Grid>

           <Grid container spacing={1} sx={{marginTop: 0.5}}>
              <Grid xs={4}>
                <TextField multiline variant="filled" rows={15} color="success" sx={{width:"100%"}}
                  value={reqHeaders[activeReqBody]} onChange={handleRequestChange}
                  autoComplete="off" name="Headers"/>
              </Grid>
              <Grid xs={8}>
                <TextField sx={{width: "100%"}} multiline variant="filled" rows={15} color="primary"
                  onChange={updateReqBody} value={reqBodies[activeReqBody]} autoComplete="off" name="RequestBody"/>
              </Grid>
           </Grid>

             <Grid container spacing={1} className="headers" sx={{m: 0.5}}>
                <Grid xs={4}>
                <FormLabel>
                  Response Header
                </FormLabel>
                </Grid>
                <Grid xs={8}>
                  <FormLabel>
                    Response
                  </FormLabel>
                  <ButtonGroup sx={{margin: "0 5px"}}>
                    { 
                      responses.map( (d, index) => <Button
                        key={index} style={{padding: "0em", minWidth: "2rem"}}
                        variant="contained" value={index} color="success" onClick={updateActiveReqTab}
                        >{index+1}</Button>)
                    }
                    <Button color="success" sx={{minWidth: "2rem", padding: "0em"}} onClick={addReqBody}><AddIcon/></Button>
                    </ButtonGroup>
                </Grid>
              </Grid>
             <Grid container spacing={1}>
                <Grid xs={4}>
                  <Typography color="primary"><span style={{fontWeight: 700}}>URL</span>: {responses[activeReqBody].URL}</Typography>
                  <JSONPretty data={result.HeadersStr}></JSONPretty>
                </Grid>
                <Grid xs={8} sx={{overflowY: "auto"}}>
                  <JSONPretty data={responses[activeReqBody].Body}></JSONPretty>
                </Grid>
             </Grid>
             <Grid container spacing={1}>
                <Grid xs={3}>
                  <FormLabel>
                    Error
                  </FormLabel>
                </Grid>
                <Grid xs={3}>
                  <JSONPretty data={result.Error}></JSONPretty>
                </Grid>
             </Grid>
          </Box>
        </ThemeProvider>
    )
}

export default App
